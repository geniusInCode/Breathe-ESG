from rest_framework import serializers
from .models import EmissionRecord, IngestionRun


class IngestionRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionRun
        fields = '__all__'


class EmissionRecordSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    run_source = serializers.CharField(source='ingestion_run.source_type', read_only=True)

    class Meta:
        model = EmissionRecord
        fields = '__all__'
