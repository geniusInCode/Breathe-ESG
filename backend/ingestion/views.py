from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import Client, IngestionRun, EmissionRecord, AuditLog
from .parsers import sap, utility, travel
from .serializers import EmissionRecordSerializer, IngestionRunSerializer


class UploadView(APIView):
    def post(self, request):
        source_type = request.data.get('source_type')
        client_id = request.data.get('client_id', 1)
        file_obj = request.FILES.get('file')

        if not file_obj or source_type not in ('SAP', 'UTILITY', 'TRAVEL'):
            return Response({'error': 'source_type and file required'}, status=400)

        client, _ = Client.objects.get_or_create(
            id=client_id,
            defaults={'name': 'Demo Client', 'slug': 'demo'}
        )
        run = IngestionRun.objects.create(
            client=client,
            source_type=source_type,
            uploaded_by=request.user if request.user.is_authenticated else None,
            filename=file_obj.name,
            status='PROCESSING',
        )

        file_bytes = file_obj.read()
        try:
            if source_type == 'SAP':
                records, errors = sap.parse(file_bytes)
            elif source_type == 'UTILITY':
                records, errors = utility.parse(file_bytes)
            else:
                records, errors = travel.parse(file_bytes)

            created = []
            for r in records:
                rec = EmissionRecord.objects.create(client=client, ingestion_run=run, **r)
                created.append(rec)

            run.status = 'DONE'
            run.row_count = len(created)
            run.error_count = len(errors)
            run.save()

            return Response({'run_id': run.id, 'rows_ingested': len(created), 'errors': errors})

        except Exception as e:
            run.status = 'FAILED'
            run.notes = str(e)
            run.save()
            return Response({'error': str(e)}, status=500)


def _clean_nan_records():
    import math
    from django.db.models import Q
    # Scan and purge any legacy records with NaN float values from previous runs
    for r in EmissionRecord.objects.all():
        try:
            if math.isnan(r.normalised_kgco2e) or math.isnan(r.activity_value) or math.isnan(r.emission_factor):
                r.delete()
        except Exception:
            pass

class RecordsView(APIView):
    def get(self, request):
        _clean_nan_records()
        qs = EmissionRecord.objects.select_related('ingestion_run', 'client').order_by('-created_at')

        status_f  = request.query_params.get('status')
        scope_f   = request.query_params.get('scope')
        flagged_f = request.query_params.get('flagged')
        client_f  = request.query_params.get('client_id')

        if status_f:  qs = qs.filter(status=status_f)
        if scope_f:   qs = qs.filter(scope=scope_f)
        if flagged_f: qs = qs.filter(is_flagged=flagged_f == 'true')
        if client_f:  qs = qs.filter(client_id=client_f)

        return Response(EmissionRecordSerializer(qs[:200], many=True).data)


class ReviewView(APIView):
    def post(self, request, pk):
        try:
            record = EmissionRecord.objects.get(pk=pk)
        except EmissionRecord.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if record.status == 'LOCKED':
            return Response({'error': 'Record is locked for audit'}, status=400)

        action = request.data.get('action')
        note   = request.data.get('note', '')

        if action not in ('APPROVED', 'REJECTED'):
            return Response({'error': 'action must be APPROVED or REJECTED'}, status=400)

        old_status = record.status
        record.status = action
        record.reviewer_note = note
        record.reviewed_at = timezone.now()
        record.save()

        AuditLog.objects.create(
            record=record,
            changed_by=request.user if request.user.is_authenticated else None,
            action=action,
            field_changed='status',
            old_value=old_status,
            new_value=action,
            note=note,
        )
        return Response({'status': record.status})


class LockView(APIView):
    def post(self, request):
        client_id = request.data.get('client_id', 1)
        updated = EmissionRecord.objects.filter(
            client_id=client_id, status='APPROVED'
        ).update(status='LOCKED')
        return Response({'locked': updated})


class StatsView(APIView):
    def get(self, request):
        _clean_nan_records()
        client_id = request.query_params.get('client_id', 1)
        qs = EmissionRecord.objects.filter(client_id=client_id)

        qs_list = list(qs)
        return Response({
            'total_kgco2e': sum(r.normalised_kgco2e for r in qs_list),
            'by_scope': {
                1: sum(r.normalised_kgco2e for r in qs_list if r.scope == 1),
                2: sum(r.normalised_kgco2e for r in qs_list if r.scope == 2),
                3: sum(r.normalised_kgco2e for r in qs_list if r.scope == 3),
            },
            'pending':  qs.filter(status='PENDING').count(),
            'approved': qs.filter(status='APPROVED').count(),
            'flagged':  qs.filter(is_flagged=True).count(),
            'locked':   qs.filter(status='LOCKED').count(),
        })


class AuditTrailView(APIView):
    def get(self, request):
        from .models import AuditLog
        logs = AuditLog.objects.select_related(
            'record', 'changed_by'
        ).order_by('-changed_at')[:100]
        
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'action': log.action,
                'changed_at': log.changed_at,
                'changed_by': log.changed_by.username if log.changed_by else 'system',
                'record_category': log.record.category,
                'record_scope': log.record.scope,
                'record_kgco2e': log.record.normalised_kgco2e,
                'old_value': log.old_value,
                'new_value': log.new_value,
                'note': log.note,
            })
        return Response(data)


class ExportView(APIView):
    def get(self, request):
        import csv
        from django.http import HttpResponse
        
        client_id = request.query_params.get('client_id', 1)
        records = EmissionRecord.objects.filter(
            client_id=client_id,
            status='LOCKED'
        )
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="emissions_audit_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'scope', 'category', 'subcategory',
            'activity_value', 'activity_unit',
            'kgco2e', 'emission_factor', 'ef_source',
            'period_start', 'period_end',
            'source_ref', 'status',
            'reviewed_by', 'reviewed_at', 'note'
        ])
        
        for r in records:
            writer.writerow([
                r.scope, r.category, r.subcategory,
                r.activity_value, r.activity_unit,
                r.normalised_kgco2e, r.emission_factor,
                r.emission_factor_source,
                r.period_start, r.period_end,
                r.source_row_ref, r.status,
                r.reviewed_by.username if r.reviewed_by else 'system',
                r.reviewed_at, r.reviewer_note
            ])
        
        return response


class BulkApproveView(APIView):
    def post(self, request):
        client_id = request.data.get('client_id', 1)
        updated = EmissionRecord.objects.filter(
            client_id=client_id,
            status='PENDING',
            is_flagged=False
        ).update(
            status='APPROVED',
            reviewed_at=timezone.now()
        )
        return Response({'approved': updated})


class RecordUpdateView(APIView):
    def post(self, request, pk):
        try:
            record = EmissionRecord.objects.get(pk=pk)
        except EmissionRecord.DoesNotExist:
            return Response({'error': 'Record not found'}, status=404)

        if record.status == 'LOCKED':
            return Response({'error': 'Record is locked for audit'}, status=400)

        # Get updated fields
        category = request.data.get('category', record.category)
        subcategory = request.data.get('subcategory', record.subcategory)
        
        try:
            activity_value = float(request.data.get('activity_value', record.activity_value))
            emission_factor = float(request.data.get('emission_factor', record.emission_factor))
        except (ValueError, TypeError):
            return Response({'error': 'activity_value and emission_factor must be numbers'}, status=400)

        activity_unit = request.data.get('activity_unit', record.activity_unit)
        emission_factor_source = request.data.get('emission_factor_source', record.emission_factor_source)
        period_start = request.data.get('period_start', record.period_start)
        period_end = request.data.get('period_end', record.period_end)
        reviewer_note = request.data.get('reviewer_note', record.reviewer_note)
        
        changes = []
        old_vals = []
        new_vals = []
        
        def track_change(field, old, new):
            if str(old) != str(new):
                changes.append(field)
                old_vals.append(f"{field}: {old}")
                new_vals.append(f"{field}: {new}")
                
        track_change('category', record.category, category)
        track_change('subcategory', record.subcategory, subcategory)
        track_change('activity_value', record.activity_value, activity_value)
        track_change('activity_unit', record.activity_unit, activity_unit)
        track_change('emission_factor', record.emission_factor, emission_factor)
        track_change('emission_factor_source', record.emission_factor_source, emission_factor_source)
        track_change('period_start', record.period_start, period_start)
        track_change('period_end', record.period_end, period_end)
        track_change('reviewer_note', record.reviewer_note, reviewer_note)

        if changes:
            record.category = category
            record.subcategory = subcategory
            record.activity_value = activity_value
            record.activity_unit = activity_unit
            record.emission_factor = emission_factor
            record.emission_factor_source = emission_factor_source
            record.period_start = period_start
            record.period_end = period_end
            record.reviewer_note = reviewer_note
            # Recompute kgCO2e
            record.normalised_kgco2e = round(activity_value * emission_factor, 4)
            
            # Resolve flag if request indicates it
            if request.data.get('resolve_flag', False):
                record.is_flagged = False
                record.flag_reason = ""
                changes.append('is_flagged')
                old_vals.append('flagged: True')
                new_vals.append('flagged: False')
                
            record.save()
            
            AuditLog.objects.create(
                record=record,
                changed_by=request.user if request.user.is_authenticated else None,
                action='UPDATED',
                field_changed=', '.join(changes),
                old_value='; '.join(old_vals),
                new_value='; '.join(new_vals),
                note=reviewer_note or 'Manual adjustments made by analyst',
            )

        return Response(EmissionRecordSerializer(record).data)


class LoadDemoDataView(APIView):
    def post(self, request):
        source_type = request.data.get('source_type')
        client_id = request.data.get('client_id', 1)
        
        if source_type not in ('SAP', 'UTILITY', 'TRAVEL'):
            return Response({'error': 'Invalid source_type'}, status=400)
            
        import os
        from django.conf import settings
        
        file_map = {
            'SAP': 'sample_sap.tsv',
            'UTILITY': 'sample_utility.csv',
            'TRAVEL': 'sample_travel.csv',
        }
        
        filename = file_map[source_type]
        # Try both the parent of settings.py and other standard folders
        sample_path = os.path.abspath(os.path.join(settings.BASE_DIR, '../sample_data', filename))
        
        if not os.path.exists(sample_path):
            sample_path = os.path.abspath(os.path.join(settings.BASE_DIR, 'sample_data', filename))
            
        if not os.path.exists(sample_path):
            return Response({'error': f'Sample file {filename} not found at {sample_path}'}, status=404)
            
        try:
            with open(sample_path, 'rb') as f:
                file_bytes = f.read()
                
            client, _ = Client.objects.get_or_create(
                id=client_id,
                defaults={'name': 'Demo Client', 'slug': 'demo'}
            )
            run = IngestionRun.objects.create(
                client=client,
                source_type=source_type,
                uploaded_by=request.user if request.user.is_authenticated else None,
                filename=filename,
                status='PROCESSING',
            )
            
            if source_type == 'SAP':
                records, errors = sap.parse(file_bytes)
            elif source_type == 'UTILITY':
                records, errors = utility.parse(file_bytes)
            else:
                records, errors = travel.parse(file_bytes)
                
            created = []
            for r in records:
                rec = EmissionRecord.objects.create(client=client, ingestion_run=run, **r)
                created.append(rec)
                
            run.status = 'DONE'
            run.row_count = len(created)
            run.error_count = len(errors)
            run.save()
            
            return Response({
                'run_id': run.id,
                'rows_ingested': len(created),
                'errors': errors,
                'message': f'Successfully ingested {filename}!'
            })
            
        except Exception as e:
            if 'run' in locals():
                run.status = 'FAILED'
                run.notes = str(e)
                run.save()
            return Response({'error': str(e)}, status=500)