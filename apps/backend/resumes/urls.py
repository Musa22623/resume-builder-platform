from django.urls import path

from resumes.views import ResumeViewSet, UploadedFileViewSet

resume_list = ResumeViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

resume_detail = ResumeViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

resume_autosave = ResumeViewSet.as_view({"post": "autosave"})
resume_create_version = ResumeViewSet.as_view({"post": "create_version"})
resume_versions = ResumeViewSet.as_view({"get": "versions"})
resume_version_detail = ResumeViewSet.as_view({"get": "version_detail"})
resume_restore_version = ResumeViewSet.as_view({"post": "restore_version"})

upload_list = UploadedFileViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

upload_detail = UploadedFileViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

upload_parse = UploadedFileViewSet.as_view({"post": "parse"})
upload_apply_parsed = UploadedFileViewSet.as_view({"post": "apply_parsed"})

urlpatterns = [
    path("items/", resume_list, name="resume-list"),
    path("items/<int:pk>/", resume_detail, name="resume-detail"),
    path("items/<int:pk>/autosave/", resume_autosave, name="resume-autosave"),
    path("items/<int:pk>/create_version/", resume_create_version, name="resume-create-version"),
    path("items/<int:pk>/versions/", resume_versions, name="resume-versions"),
    path("items/<int:pk>/versions/<int:version_id>/", resume_version_detail, name="resume-version-detail"),
    path("items/<int:pk>/restore_version/", resume_restore_version, name="resume-restore-version"),
    path("uploads/", upload_list, name="upload-list"),
    path("uploads/<int:pk>/", upload_detail, name="upload-detail"),
    path("uploads/<int:pk>/parse/", upload_parse, name="upload-parse"),
    path("uploads/<int:pk>/apply-parsed/", upload_apply_parsed, name="upload-apply-parsed"),
]
