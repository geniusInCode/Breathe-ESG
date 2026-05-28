from django.test import TestCase
from rest_framework.test import APITestCase
from ingestion.models import Client, IngestionRun, EmissionRecord
from ingestion.views import _get_or_create_client, _clean_nan_records
from ingestion.serializers import EmissionRecordSerializer
from ingestion.parsers import travel, sap, utility
from unittest.mock import patch, MagicMock
import math


class WorkspaceClientNamingTests(TestCase):
    def test_dynamic_client_naming(self):
        client1 = _get_or_create_client(1)
        self.assertEqual(client1.name, "Workspace Alpha")
        self.assertEqual(client1.slug, "workspace-1")

        client2 = _get_or_create_client(2)
        self.assertEqual(client2.name, "Workspace Beta")
        self.assertEqual(client2.slug, "workspace-2")

        client_custom = _get_or_create_client(99)
        self.assertEqual(client_custom.name, "Workspace 99")
        self.assertEqual(client_custom.slug, "workspace-99")


class ParserSafetyTests(TestCase):
    def test_travel_parser_nan_handling(self):
        # Empty distances, nights, rail metrics should default safely and not produce NaNs
        csv_data = (
            "trip_id,category,origin,destination,travel_date,distance_km,nights\n"
            "T001,AIR,BLR,LHR,2024-03-10,,\n"
            "T002,HOTEL,,,2024-03-10,,\n"
            "T003,RAIL,,,2024-03-12,,\n"
            "T004,CAR,,,2024-03-15,,\n"
        )
        records, errors = travel.parse(csv_data.encode("utf-8"))
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(records), 4)

        for r in records:
            self.assertFalse(math.isnan(r["activity_value"]))
            self.assertFalse(math.isnan(r["normalised_kgco2e"]))
            self.assertFalse(math.isnan(r["emission_factor"]))

    def test_sap_parser_nan_handling(self):
        # Quantity NaN should cause an ingestion error in the row instead of DB insertion
        tsv_data = (
            "MENGE\tMEINS\tBUDAT\tTXZ01\n"
            "NaN\tLTR\t2024-03-10\tDiesel Fuel\n"
            "100\tLTR\t2024-03-10\tDiesel Fuel\n"
        )
        records, errors = sap.parse(tsv_data.encode("utf-8"))
        self.assertEqual(len(errors), 1)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["activity_value"], 100.0)

    def test_utility_parser_nan_handling(self):
        # Consumption NaN should cause an ingestion error in the row instead of DB insertion
        csv_data = (
            "meter_id,billing_start,billing_end,consumption_kwh\n"
            "M1,2024-03-01,2024-03-31,NaN\n"
            "M1,2024-03-01,2024-03-31,500.0\n"
        )
        records, errors = utility.parse(csv_data.encode("utf-8"))
        self.assertEqual(len(errors), 1)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["activity_value"], 500.0)


class DatabaseCleanupAndSerializerTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(name="Test Client", slug="test")
        self.run = IngestionRun.objects.create(
            client=self.client_obj,
            source_type="TRAVEL",
            filename="test.csv",
            status="DONE",
        )

    def test_clean_nan_records_removes_nan_rows(self):
        valid_rec = MagicMock(spec=EmissionRecord)
        valid_rec.normalised_kgco2e = 100.0
        valid_rec.activity_value = 5.0
        valid_rec.emission_factor = 20.0

        corrupt_rec = MagicMock(spec=EmissionRecord)
        corrupt_rec.normalised_kgco2e = float("nan")
        corrupt_rec.activity_value = 5.0
        corrupt_rec.emission_factor = 20.0

        # Force database operation to fail to test the Python fallback logic
        with patch("django.db.connection.cursor", side_effect=Exception("Simulate DB error")):
            with patch("ingestion.models.EmissionRecord.objects.all", return_value=[valid_rec, corrupt_rec]):
                _clean_nan_records()
                # valid_rec should NOT be deleted
                valid_rec.delete.assert_not_called()
                # corrupt_rec should be deleted
                corrupt_rec.delete.assert_called_once()

    def test_serializer_cleans_nan_fields(self):
        # Create an unsaved model instance to avoid SQLite's constraint checks in test setup
        corrupt_rec = EmissionRecord(
            client=self.client_obj,
            ingestion_run=self.run,
            scope=3,
            category="hotel",
            activity_value=float("nan"),
            activity_unit="nights",
            normalised_kgco2e=float("nan"),
            emission_factor=float("inf"),
            period_start="2024-03-10",
            period_end="2024-03-10",
        )
        data = EmissionRecordSerializer(corrupt_rec).data
        # Values should be sanitized to 0.0 or valid JSON compliance instead of nan/inf
        self.assertEqual(data["activity_value"], 0.0)
        self.assertEqual(data["normalised_kgco2e"], 0.0)
        self.assertEqual(data["emission_factor"], 0.0)


class RecordUpdateValidationTests(APITestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(name="Test Client", slug="test")
        self.run = IngestionRun.objects.create(
            client=self.client_obj,
            source_type="TRAVEL",
            filename="test.csv",
            status="DONE",
        )
        self.record = EmissionRecord.objects.create(
            client=self.client_obj,
            ingestion_run=self.run,
            scope=3,
            category="hotel",
            activity_value=2.0,
            activity_unit="nights",
            normalised_kgco2e=180.0,
            emission_factor=90.0,
            period_start="2024-03-10",
            period_end="2024-03-10",
        )

    def test_update_record_rejects_nan_and_inf(self):
        url = f"/api/records/{self.record.id}/update/"

        # Send NaN activity_value
        res = self.client.post(url, {"activity_value": "NaN"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("must be valid finite numbers", res.data["error"])

        # Send Infinity emission_factor
        res2 = self.client.post(url, {"emission_factor": "Infinity"})
        self.assertEqual(res2.status_code, 400)

        # Verify record remains unchanged
        self.record.refresh_from_db()
        self.assertEqual(self.record.activity_value, 2.0)
        self.assertEqual(self.record.emission_factor, 90.0)
