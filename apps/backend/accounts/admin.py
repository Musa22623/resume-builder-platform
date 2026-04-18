from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = (
        'id',
        'username',
        'email',
        'role',
        'email_verified',
        'is_active',
        'is_staff',
    )
    list_filter = (
        'role',
        'email_verified',
        'is_active',
        'is_staff',
    )
    search_fields = ('email', 'username')
    ordering = ('id',)
    inlines = [UserProfileInline]

    fieldsets = UserAdmin.fieldsets + (
        (
            'Custom Fields',
            {
                'fields': ('role', 'email_verified', 'created_at', 'updated_at'),
            },
        ),
    )

    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'full_name', 'phone', 'country', 'timezone')
    search_fields = ('user__email', 'full_name', 'phone')