from django.contrib import admin
from .models import Client, IngestionRun, EmissionRecord, AuditLog


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']


@admin.register(IngestionRun)
class IngestionRunAdmin(admin.ModelAdmin):
    list_display = ['client', 'source_type', 'status', 'row_count', 'error_count', 'uploaded_at']
    list_filter = ['source_type', 'status']


@admin.register(EmissionRecord)
class EmissionRecordAdmin(admin.ModelAdmin):
    list_display = ['client', 'category', 'scope', 'normalised_kgco2e',
                    'status', 'is_flagged', 'period_start']
    list_filter = ['scope', 'status', 'is_flagged', 'category']
    search_fields = ['category', 'source_row_ref']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['record', 'action', 'changed_by', 'changed_at']
    list_filter = ['action']
