import { curriculumManagementRepository } from "./curriculumManagement.repository";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

/**
 * Curriculum Management Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for curriculum operations.
 * Uses CurriculumManagementRepository for data access.
 */

// Service context for authorization (use centralized type)
export type ServiceContext = AuthContext;

// Input DTOs
export interface AssignSubjectInput {
  gradeId: string;
  subjectId: string;
  isCore: boolean;
}

export interface BulkAssignSubjectsInput {
  gradeId: string;
  subjects: Array<{ subjectId: string; isCore: boolean }>;
}

export interface BulkAssignSubjectsToClassInput {
  classId: string;
  subjects: Array<{ subjectId: string; isCore: boolean; periodsPerWeek?: number }>;
}

export class CurriculumManagementService {
  // ==================== VALIDATION METHODS ====================

  /**
   * Validate that grade exists
   */
  private async validateGradeExists(gradeId: string): Promise<void> {
    const grades = await curriculumManagementRepository.findAllGrades();
    const gradeExists = grades.some((g) => g.id === gradeId);

    if (!gradeExists) {
      throw new NotFoundError(`Grade with ID ${gradeId} not found`);
    }
  }

  /**
   * Validate that subject exists
   */
  private async validateSubjectExists(subjectId: string): Promise<void> {
    const subjects = await curriculumManagementRepository.findAllSubjects();
    const subjectExists = subjects.some((s) => s.id === subjectId);

    if (!subjectExists) {
      throw new NotFoundError(`Subject with ID ${subjectId} not found`);
    }
  }

  /**
   * Validate that subject is not already assigned to grade
   */
  private async validateSubjectNotAssigned(
    gradeId: string,
    subjectId: string
  ): Promise<void> {
    const isAssigned = await curriculumManagementRepository.isSubjectAssignedToGrade(
      gradeId,
      subjectId
    );

    if (isAssigned) {
      throw new ValidationError("Subject is already assigned to this grade");
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get all grades with their assigned subjects
   * Only ADMIN or HEAD_TEACHER can view curriculum
   */
  async getAllGradesWithSubjects(context: ServiceContext) {
    // Check permissions - only ADMIN or HEAD_TEACHER
    requireMinimumRole(
      context,
      Role.HEAD_TEACHER,
      "Insufficient permissions to view curriculum"
    );

    return curriculumManagementRepository.findAllGradesWithSubjects();
  }

  /**
   * Get subjects assigned to a specific grade
   * Only ADMIN or HEAD_TEACHER can view curriculum
   */
  async getSubjectsByGrade(gradeId: string, context: ServiceContext) {
    // Check permissions - only ADMIN or HEAD_TEACHER
    requireMinimumRole(
      context,
      Role.HEAD_TEACHER,
      "Insufficient permissions to view curriculum"
    );

    await this.validateGradeExists(gradeId);
    return curriculumManagementRepository.findSubjectsByGrade(gradeId);
  }

  /**
   * Get all available subjects (for dropdowns)
   * Only ADMIN or HEAD_TEACHER can view
   */
  async getAllSubjects(context: ServiceContext) {
    // Check permissions - only ADMIN or HEAD_TEACHER
    requireMinimumRole(
      context,
      Role.HEAD_TEACHER,
      "Insufficient permissions to view subjects"
    );

    return curriculumManagementRepository.findAllSubjects();
  }

  /**
   * Get all grades (for dropdowns)
   * Only ADMIN or HEAD_TEACHER can view
   */
  async getAllGrades(context: ServiceContext) {
    // Check permissions - only ADMIN or HEAD_TEACHER
    requireMinimumRole(
      context,
      Role.HEAD_TEACHER,
      "Insufficient permissions to view grades"
    );

    return curriculumManagementRepository.findAllGrades();
  }

  /**
   * Assign a subject to a grade
   * Only ADMIN can modify curriculum
   */
  async assignSubjectToGrade(
    input: AssignSubjectInput,
    context: ServiceContext
  ) {
    // Check permissions - only ADMIN
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can modify curriculum"
    );

    // Validate
    await this.validateGradeExists(input.gradeId);
    await this.validateSubjectExists(input.subjectId);
    await this.validateSubjectNotAssigned(input.gradeId, input.subjectId);

    return curriculumManagementRepository.assignSubjectToGrade(input);
  }

  /**
   * Bulk assign subjects to a grade
   * Replaces all existing assignments
   * Only ADMIN can modify curriculum
   */
  async bulkAssignSubjectsToGrade(
    input: BulkAssignSubjectsInput,
    context: ServiceContext
  ) {
    // Check permissions - only ADMIN
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can modify curriculum"
    );

    // Validate grade exists
    await this.validateGradeExists(input.gradeId);

    // Validate all subjects exist
    for (const subject of input.subjects) {
      await this.validateSubjectExists(subject.subjectId);
    }

    return curriculumManagementRepository.bulkAssignSubjectsToGrade(
      input.gradeId,
      input.subjects
    );
  }

  /**
   * Update isCore flag for a grade-subject assignment
   * Only ADMIN can modify curriculum
   */
  async updateSubjectCoreStatus(
    gradeId: string,
    subjectId: string,
    isCore: boolean,
    context: ServiceContext
  ) {
    // Check permissions - only ADMIN
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can modify curriculum"
    );

    // Validate
    await this.validateGradeExists(gradeId);
    await this.validateSubjectExists(subjectId);

    return curriculumManagementRepository.updateSubjectCoreStatus(
      gradeId,
      subjectId,
      isCore
    );
  }

  /**
   * Remove a subject from a grade
   * Only ADMIN can modify curriculum
   */
  async removeSubjectFromGrade(
    gradeId: string,
    subjectId: string,
    context: ServiceContext
  ) {
    // Check permissions - only ADMIN
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can modify curriculum"
    );

    // Validate
    await this.validateGradeExists(gradeId);
    await this.validateSubjectExists(subjectId);

    return curriculumManagementRepository.removeSubjectFromGrade(
      gradeId,
      subjectId
    );
  }

  // ==================== CLASS SUBJECT METHODS ====================

  /**
   * Validate that class exists
   */
  private async validateClassExists(classId: string): Promise<void> {
    const cls = await curriculumManagementRepository.findClassById(classId);
    if (!cls) {
      throw new NotFoundError(`Class with ID ${classId} not found`);
    }
  }

  /**
   * Get subjects assigned to a specific class/stream
   * Only ADMIN or HEAD_TEACHER can view curriculum
   */
  async getSubjectsByClass(classId: string, context: ServiceContext) {
    // Check permissions - only ADMIN or HEAD_TEACHER
    requireMinimumRole(
      context,
      Role.HEAD_TEACHER,
      "Insufficient permissions to view curriculum"
    );

    await this.validateClassExists(classId);
    return curriculumManagementRepository.findSubjectsByClass(classId);
  }

  /**
   * Bulk assign subjects to a class/stream
   * Replaces all existing assignments
   * Only ADMIN can modify curriculum
   */
  async bulkAssignSubjectsToClass(
    input: BulkAssignSubjectsToClassInput,
    context: ServiceContext
  ) {
    // Check permissions - only ADMIN
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can modify curriculum"
    );

    // Validate class exists
    await this.validateClassExists(input.classId);

    // Validate all subjects exist
    for (const subject of input.subjects) {
      await this.validateSubjectExists(subject.subjectId);
    }

    return curriculumManagementRepository.bulkAssignSubjectsToClass(
      input.classId,
      input.subjects
    );
  }
}

export const curriculumManagementService = new CurriculumManagementService();
