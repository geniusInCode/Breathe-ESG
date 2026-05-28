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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Clean any float fields that might be NaN to prevent JSON serialization errors
        for field in ('normalised_kgco2e', 'activity_value', 'emission_factor'):
            val = ret.get(field)
            if val is not None:
                try:
                    import math
                    fval = float(val)
                    if math.isnan(fval) or math.isinf(fval):
                        ret[field] = 0.0
                except (ValueError, TypeError):
                    ret[field] = 0.0
        return ret
