from django.db import models
from django.contrib.auth.models import User


class Client(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class IngestionRun(models.Model):
    SOURCE_TYPES = [
        ('SAP', 'SAP Fuel/Procurement'),
        ('UTILITY', 'Utility Electricity'),
        ('TRAVEL', 'Corporate Travel'),
    ]
    STATUS = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('DONE', 'Done'),
        ('FAILED', 'Failed'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='runs')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    filename = models.CharField(max_length=300)
    status = models.CharField(max_length=20, choices=STATUS, default='PENDING')
    row_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.client} | {self.source_type} | {self.uploaded_at.date()}"


class EmissionRecord(models.Model):
    SCOPE_CHOICES = [(1, 'Scope 1'), (2, 'Scope 2'), (3, 'Scope 3')]
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('LOCKED', 'Locked for Audit'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='records')
    ingestion_run = models.ForeignKey(IngestionRun, on_delete=models.CASCADE, related_name='records')
    source_row_ref = models.CharField(max_length=200, blank=True)

    scope = models.IntegerField(choices=SCOPE_CHOICES)
    category = models.CharField(max_length=100)
    subcategory = models.CharField(max_length=100, blank=True)

    activity_value = models.FloatField()
    activity_unit = models.CharField(max_length=50)

    normalised_kgco2e = models.FloatField()
    emission_factor = models.FloatField()
    emission_factor_source = models.CharField(max_length=200, default='DEFRA 2023')

    period_start = models.DateField()
    period_end = models.DateField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='reviewed_records')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_note = models.TextField(blank=True)

    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client} | {self.category} | {self.period_start}"


class AuditLog(models.Model):
    """Append-only. Never update rows here."""
    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name='audit_logs')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=50)
    field_changed = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    note = models.TextField(blank=True)
