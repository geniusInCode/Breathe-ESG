from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.UploadView.as_view()),
    path('records/', views.RecordsView.as_view()),
    path('records/<int:pk>/review/', views.ReviewView.as_view()),
    path('records/<int:pk>/update/', views.RecordUpdateView.as_view()),
    path('lock/', views.LockView.as_view()),
    path('stats/', views.StatsView.as_view()),
    path('audit/', views.AuditTrailView.as_view()),
    path('export/', views.ExportView.as_view()),
    path('bulk-approve/', views.BulkApproveView.as_view()),
    path('demo/load/', views.LoadDemoDataView.as_view()),
]