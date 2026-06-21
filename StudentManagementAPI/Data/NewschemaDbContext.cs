using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using StudentManagementAPI.Models;

namespace StudentManagementAPI.Data;

public partial class NewschemaDbContext : DbContext
{
    public NewschemaDbContext(DbContextOptions<NewschemaDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<District> Districts { get; set; }

    public virtual DbSet<GroupSchoolAssignment> GroupSchoolAssignments { get; set; }

    public virtual DbSet<ModelHasRole> ModelHasRoles { get; set; }

    public virtual DbSet<Region> Regions { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<SchoolClass> SchoolClasses { get; set; }

    public virtual DbSet<SchoolsManagement> SchoolsManagements { get; set; }

    public virtual DbSet<StudentChangeHistory> StudentChangeHistories { get; set; }

    public virtual DbSet<StudentsManagement> StudentsManagements { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<District>(entity =>
        {
            entity.HasKey(e => e.DistrictId).HasName("PRIMARY");

            entity
                .ToTable("districts")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.DistrictName, "districts_district_name_index");

            entity.HasIndex(e => e.RegionId, "districts_region_id_index");

            entity.HasIndex(e => new { e.DistrictName, e.RegionId }, "unique_district_per_region").IsUnique();

            entity.Property(e => e.DistrictId).HasColumnName("district_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.DistrictName)
                .HasMaxLength(191)
                .HasColumnName("district_name");
            entity.Property(e => e.RegionId).HasColumnName("region_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Region).WithMany(p => p.Districts)
                .HasForeignKey(d => d.RegionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("districts_region_id_foreign");
        });

        modelBuilder.Entity<GroupSchoolAssignment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("group_school_assignments")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.GroupId, "group_school_assignments_group_id_index");

            entity.HasIndex(e => new { e.GroupId, e.SchoolNumber }, "group_school_assignments_group_id_school_number_unique").IsUnique();

            entity.HasIndex(e => e.SchoolNumber, "group_school_assignments_school_number_index");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.SchoolNumber)
                .HasMaxLength(50)
                .HasColumnName("school_number");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.SchoolNumberNavigation).WithMany(p => p.GroupSchoolAssignments)
                .HasPrincipalKey(p => p.SchoolNumber)
                .HasForeignKey(d => d.SchoolNumber)
                .HasConstraintName("group_school_assignments_school_number_foreign");
        });

        modelBuilder.Entity<ModelHasRole>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.ModelId, e.ModelType })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0, 0 });

            entity
                .ToTable("model_has_roles")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => new { e.ModelId, e.ModelType }, "model_has_roles_model_id_model_type_index");

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.ModelId).HasColumnName("model_id");
            entity.Property(e => e.ModelType)
                .HasMaxLength(191)
                .HasColumnName("model_type");

            entity.HasOne(d => d.Role).WithMany(p => p.ModelHasRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("model_has_roles_role_id_foreign");
        });

        modelBuilder.Entity<Region>(entity =>
        {
            entity.HasKey(e => e.RegionId).HasName("PRIMARY");

            entity
                .ToTable("regions")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.RegionCode, "regions_region_code_unique").IsUnique();

            entity.HasIndex(e => e.RegionName, "regions_region_name_index").IsUnique();

            entity.Property(e => e.RegionId).HasColumnName("region_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.RegionCode)
                .HasMaxLength(10)
                .HasColumnName("region_code");
            entity.Property(e => e.RegionName)
                .HasMaxLength(191)
                .HasColumnName("region_name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("roles")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => new { e.Name, e.GuardName }, "roles_name_guard_name_unique").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.GuardName)
                .HasMaxLength(191)
                .HasColumnName("guard_name");
            entity.Property(e => e.Name)
                .HasMaxLength(191)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("school_classes")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.SchoolId, "school_classes_school_id_index");

            entity.HasIndex(e => new { e.SchoolNumber, e.ClassCode }, "school_classes_school_number_class_code_unique").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AcademicYear)
                .HasMaxLength(20)
                .HasColumnName("academic_year");
            entity.Property(e => e.ClassCode)
                .HasMaxLength(50)
                .HasComment("Matches students_management.class_id")
                .HasColumnName("class_code");
            entity.Property(e => e.ClassName)
                .HasMaxLength(191)
                .HasColumnName("class_name");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.GradeLevel)
                .HasMaxLength(50)
                .HasColumnName("grade_level");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("is_active");
            entity.Property(e => e.SchoolId).HasColumnName("school_id");
            entity.Property(e => e.SchoolNumber)
                .HasMaxLength(50)
                .HasColumnName("school_number");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<SchoolsManagement>(entity =>
        {
            entity.HasKey(e => e.SchoolId).HasName("PRIMARY");

            entity
                .ToTable("schools_management")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.District, "schools_management_district_index");

            entity.HasIndex(e => e.Location, "schools_management_location_index");

            entity.HasIndex(e => e.Ownership, "schools_management_ownership_index");

            entity.HasIndex(e => e.RegionId, "schools_management_region_id_index");

            entity.HasIndex(e => e.Region, "schools_management_region_index");

            entity.HasIndex(e => e.SchoolLevel, "schools_management_school_level_index");

            entity.HasIndex(e => e.SchoolNumber, "schools_management_school_number_index").IsUnique();

            entity.HasIndex(e => e.TotalStudents, "schools_management_total_students_index");

            entity.Property(e => e.SchoolId).HasColumnName("school_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.District)
                .HasMaxLength(191)
                .HasColumnName("district");
            entity.Property(e => e.ExamCenterName)
                .HasMaxLength(255)
                .HasColumnName("exam_center_name");
            entity.Property(e => e.HeadTeacher)
                .HasMaxLength(191)
                .HasColumnName("head_teacher");
            entity.Property(e => e.Location)
                .HasMaxLength(191)
                .HasColumnName("location");
            entity.Property(e => e.Ownership)
                .HasMaxLength(191)
                .HasColumnName("ownership");
            entity.Property(e => e.Region)
                .HasMaxLength(191)
                .HasColumnName("region");
            entity.Property(e => e.RegionId).HasColumnName("region_id");
            entity.Property(e => e.SchoolLevel)
                .HasMaxLength(191)
                .HasColumnName("school_level");
            entity.Property(e => e.SchoolName)
                .HasMaxLength(191)
                .HasColumnName("school_name");
            entity.Property(e => e.SchoolNumber)
                .HasMaxLength(50)
                .HasColumnName("school_number");
            entity.Property(e => e.Telephone)
                .HasMaxLength(191)
                .HasColumnName("telephone");
            entity.Property(e => e.TotalStudents).HasColumnName("total_students");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.RegionNavigation).WithMany(p => p.SchoolsManagements)
                .HasForeignKey(d => d.RegionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("schools_management_region_id_foreign");
        });

        modelBuilder.Entity<StudentChangeHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("student_change_history")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.ChangedByUserId, "student_change_history_changed_by_user_id_index");

            entity.HasIndex(e => e.CreatedAt, "student_change_history_created_at_index");

            entity.HasIndex(e => e.FieldName, "student_change_history_field_name_index");

            entity.HasIndex(e => e.StudentUniqueId, "student_change_history_student_unique_id_index");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChangeType)
                .HasMaxLength(191)
                .HasDefaultValueSql("'update'")
                .HasColumnName("change_type");
            entity.Property(e => e.ChangedByUserId).HasColumnName("changed_by_user_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.FieldName)
                .HasMaxLength(191)
                .HasColumnName("field_name");
            entity.Property(e => e.NewValue)
                .HasColumnType("text")
                .HasColumnName("new_value");
            entity.Property(e => e.Notes)
                .HasColumnType("text")
                .HasColumnName("notes");
            entity.Property(e => e.OldValue)
                .HasColumnType("text")
                .HasColumnName("old_value");
            entity.Property(e => e.StudentUniqueId)
                .HasMaxLength(191)
                .HasColumnName("student_unique_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.ChangedByUser).WithMany(p => p.StudentChangeHistories)
                .HasForeignKey(d => d.ChangedByUserId)
                .HasConstraintName("student_change_history_changed_by_user_id_foreign");

            entity.HasOne(d => d.StudentUnique).WithMany(p => p.StudentChangeHistories)
                .HasPrincipalKey(p => p.UniqueId)
                .HasForeignKey(d => d.StudentUniqueId)
                .HasConstraintName("student_change_history_student_unique_id_foreign");
        });

        modelBuilder.Entity<StudentsManagement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("students_management")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.AccYear, "students_management_acc_year_index");

            entity.HasIndex(e => e.ClassId, "students_management_class_id_index");

            entity.HasIndex(e => e.CollectedStatus, "students_management_collected_status_index");

            entity.HasIndex(e => e.District, "students_management_district_index");

            entity.HasIndex(e => e.ImageName, "students_management_image_name_index");

            entity.HasIndex(e => e.ImageStatus, "students_management_image_status_index");

            entity.HasIndex(e => e.ImageUrl, "students_management_image_url_index");

            entity.HasIndex(e => e.Level, "students_management_level_index");

            entity.HasIndex(e => e.RegionId, "students_management_region_id_index");

            entity.HasIndex(e => e.Region, "students_management_region_index");

            entity.HasIndex(e => e.SchoolId, "students_management_school_id_index");

            entity.HasIndex(e => e.SchoolNumber, "students_management_school_number_index");

            entity.HasIndex(e => e.Sex, "students_management_sex_index");

            entity.HasIndex(e => e.Status, "students_management_status_index");

            entity.HasIndex(e => e.StudentNo, "students_management_student_no_index");

            entity.HasIndex(e => e.UniqueId, "students_management_unique_id_index").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AccYear)
                .HasMaxLength(20)
                .HasComment("AccYear: Academic year (e.g., 2025/2026)")
                .HasColumnName("acc_year");
            entity.Property(e => e.ClassId)
                .HasMaxLength(50)
                .HasComment("ClassID: Class identifier (e.g., 8A)")
                .HasColumnName("class_id");
            entity.Property(e => e.CollectedStatus)
                .HasMaxLength(3)
                .HasColumnName("collected_status");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.DeletedAt)
                .HasColumnType("timestamp")
                .HasColumnName("deleted_at");
            entity.Property(e => e.District)
                .HasMaxLength(191)
                .HasColumnName("district");
            entity.Property(e => e.DocumentName)
                .HasMaxLength(191)
                .HasColumnName("document_name");
            entity.Property(e => e.EmergencyContactName)
                .HasMaxLength(191)
                .HasColumnName("emergency_contact_name");
            entity.Property(e => e.EmergencyContactPhone)
                .HasMaxLength(30)
                .HasColumnName("emergency_contact_phone");
            entity.Property(e => e.EnglishName)
                .HasMaxLength(255)
                .HasColumnName("english_name");
            entity.Property(e => e.HeadTeacher)
                .HasMaxLength(191)
                .HasColumnName("head_teacher");
            entity.Property(e => e.IdCardSerial)
                .HasMaxLength(40)
                .HasColumnName("id_card_serial");
            entity.Property(e => e.ImageName)
                .HasMaxLength(191)
                .HasColumnName("image_name");
            entity.Property(e => e.ImageStatus)
                .HasDefaultValueSql("'missing_image'")
                .HasColumnType("enum('has_image','missing_image','mismatch')")
                .HasColumnName("image_status");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(191)
                .HasColumnName("image_url");
            entity.Property(e => e.Level)
                .HasMaxLength(191)
                .HasColumnName("level");
            entity.Property(e => e.Location)
                .HasMaxLength(191)
                .HasColumnName("location");
            entity.Property(e => e.MNam)
                .HasMaxLength(255)
                .HasComment("Mother Name: Name of student's mother")
                .HasColumnName("m_nam");
            entity.Property(e => e.Ownership)
                .HasMaxLength(191)
                .HasColumnName("ownership");
            entity.Property(e => e.Region)
                .HasMaxLength(191)
                .HasColumnName("region");
            entity.Property(e => e.RegionId).HasColumnName("region_id");
            entity.Property(e => e.RemovalReason)
                .HasColumnType("text")
                .HasColumnName("removal_reason");
            entity.Property(e => e.SchoolId).HasColumnName("school_id");
            entity.Property(e => e.SchoolName)
                .HasMaxLength(191)
                .HasColumnName("school_name");
            entity.Property(e => e.SchoolNumber)
                .HasMaxLength(50)
                .HasComment("Schoolid: School identifier (e.g., 7453)")
                .HasColumnName("school_number");
            entity.Property(e => e.Sex)
                .HasMaxLength(10)
                .HasComment("Student sex: M (Male), F (Female), or other values")
                .HasColumnName("sex");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'active'")
                .HasColumnType("enum('active','transferred','inactive')")
                .HasColumnName("status");
            entity.Property(e => e.StudentName)
                .HasMaxLength(255)
                .HasComment("FullName: Full name of the student")
                .HasColumnName("student_name");
            entity.Property(e => e.StudentNo)
                .HasMaxLength(50)
                .HasComment("StudentNo: Student number (e.g., 2045375)")
                .HasColumnName("student_no");
            entity.Property(e => e.Telephone)
                .HasMaxLength(191)
                .HasColumnName("telephone");
            entity.Property(e => e.UniqueId)
                .HasComment("Uniqueid: Unique student identifier (e.g., 19-906528)")
                .HasColumnName("unique_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.RegionNavigation).WithMany(p => p.StudentsManagements)
                .HasForeignKey(d => d.RegionId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("students_management_region_id_foreign");

            entity.HasOne(d => d.School).WithMany(p => p.StudentsManagements)
                .HasForeignKey(d => d.SchoolId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("students_management_school_id_foreign");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("users")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Email, "users_email_index").IsUnique();

            entity.HasIndex(e => e.EmployeeId, "users_employee_id_index").IsUnique();

            entity.HasIndex(e => e.GroupId, "users_group_id_index");

            entity.HasIndex(e => e.Status, "users_status_index");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt)
                .HasColumnType("timestamp")
                .HasColumnName("deleted_at");
            entity.Property(e => e.Email)
                .HasMaxLength(191)
                .HasColumnName("email");
            entity.Property(e => e.EmailVerifiedAt)
                .HasColumnType("timestamp")
                .HasColumnName("email_verified_at");
            entity.Property(e => e.EmployeeId)
                .HasMaxLength(191)
                .HasColumnName("employee_id");
            entity.Property(e => e.GroupId).HasColumnName("group_id");
            entity.Property(e => e.MustChangePassword).HasColumnName("must_change_password");
            entity.Property(e => e.Name)
                .HasMaxLength(191)
                .HasColumnName("name");
            entity.Property(e => e.Password)
                .HasMaxLength(191)
                .HasColumnName("password");
            entity.Property(e => e.PasswordChangedAt)
                .HasColumnType("timestamp")
                .HasColumnName("password_changed_at");
            entity.Property(e => e.Phone)
                .HasMaxLength(191)
                .HasColumnName("phone");
            entity.Property(e => e.RememberToken)
                .HasMaxLength(100)
                .HasColumnName("remember_token");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'active'")
                .HasColumnType("enum('active','inactive','suspended')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp")
                .HasColumnName("updated_at");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
