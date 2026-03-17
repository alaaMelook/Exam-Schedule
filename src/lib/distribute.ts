import { Employee, Committee, Assignment } from './supabase'

export type DistributionMode = 'sequential' | 'random'

export interface DistributionResult {
  assignments: { employee_id: string; committee_id: string; type: 'أساسي' | 'احتياطي' }[]
  warnings: string[]
}

/**
 * Auto-distribute employees across committees.
 * Rules:
 *  - Each committee needs `main_observers` main + `backup_observers` backup
 *  - No employee can be in two committees at the same time (overlapping times on same day)
 *  - Try to balance load (fewest assignments first)
 *  - Respect sequential vs random mode
 */
export function autoDistribute(
  employees: Employee[],
  committees: Committee[],
  existingAssignments: Assignment[],
  mode: DistributionMode
): DistributionResult {
  const result: DistributionResult = { assignments: [], warnings: [] }

  if (employees.length === 0) {
    result.warnings.push('لا يوجد موظفون مسجلون')
    return result
  }

  // Track load per employee: how many assignments they have
  const load = new Map<string, number>(employees.map(e => [e.id, 0]))

  // Count existing assignments in load
  existingAssignments.forEach(a => {
    load.set(a.employee_id, (load.get(a.employee_id) || 0) + 1)
  })

  // Track which committees each employee is already assigned to (for conflict detection)
  const empAssignedCommittees = new Map<string, Set<string>>(
    employees.map(e => [e.id, new Set<string>()])
  )
  existingAssignments.forEach(a => {
    empAssignedCommittees.get(a.employee_id)?.add(a.committee_id)
  })

  // Sort committees by date then time
  const sortedCommittees = [...committees].sort((a, b) => {
    if (a.exam_date !== b.exam_date) return a.exam_date.localeCompare(b.exam_date)
    return a.start_time.localeCompare(b.start_time)
  })

  // Check time conflict between two committees
  function hasTimeConflict(c1: Committee, c2: Committee): boolean {
    if (c1.exam_date !== c2.exam_date) return false
    // Overlap if one starts before the other ends
    return c1.start_time < c2.end_time && c2.start_time < c1.end_time
  }

  // Get committees already assigned to an employee (including newly added in this run)
  function getEmployeeCommittees(empId: string): Committee[] {
    const assignedIds = empAssignedCommittees.get(empId) || new Set()
    const newAssignedIds = result.assignments
      .filter(a => a.employee_id === empId)
      .map(a => a.committee_id)
    const allIds = new Set([...assignedIds, ...newAssignedIds])
    return committees.filter(c => allIds.has(c.id))
  }

  // Check if employee can be assigned to committee
  function canAssign(empId: string, committee: Committee): boolean {
    const empCommittees = getEmployeeCommittees(empId)
    return !empCommittees.some(c => hasTimeConflict(c, committee))
  }

  // Get available employees for a committee sorted by load
  function getAvailableEmployees(committee: Committee): Employee[] {
    const alreadyAssigned = new Set([
      ...existingAssignments.filter(a => a.committee_id === committee.id).map(a => a.employee_id),
      ...result.assignments.filter(a => a.committee_id === committee.id).map(a => a.employee_id),
    ])

    let available = employees.filter(e =>
      !alreadyAssigned.has(e.id) && canAssign(e.id, committee)
    )

    if (mode === 'random') {
      // Shuffle
      available = available.sort(() => Math.random() - 0.5)
    } else {
      // Sequential: sort by load (least assigned first)
      available = available.sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))
    }

    return available
  }

  // Process each committee
  for (const committee of sortedCommittees) {
    // How many are already assigned to this committee?
    const existingMain = existingAssignments.filter(
      a => a.committee_id === committee.id && a.type === 'أساسي'
    ).length + result.assignments.filter(
      a => a.committee_id === committee.id && a.type === 'أساسي'
    ).length

    const existingBackup = existingAssignments.filter(
      a => a.committee_id === committee.id && a.type === 'احتياطي'
    ).length + result.assignments.filter(
      a => a.committee_id === committee.id && a.type === 'احتياطي'
    ).length

    const neededMain = committee.main_observers - existingMain
    const neededBackup = committee.backup_observers - existingBackup

    // Assign main observers
    if (neededMain > 0) {
      const available = getAvailableEmployees(committee)
      const toAssign = available.slice(0, neededMain)

      if (toAssign.length < neededMain) {
        result.warnings.push(
          `لجنة "${committee.name}" (${committee.exam_date}): تحتاج ${neededMain} أساسي، متاح فقط ${toAssign.length}`
        )
      }

      toAssign.forEach(emp => {
        result.assignments.push({
          employee_id: emp.id,
          committee_id: committee.id,
          type: 'أساسي',
        })
        load.set(emp.id, (load.get(emp.id) || 0) + 1)
      })
    }

    // Assign backup observers
    if (neededBackup > 0) {
      const available = getAvailableEmployees(committee)
      const toAssign = available.slice(0, neededBackup)

      if (toAssign.length < neededBackup) {
        result.warnings.push(
          `لجنة "${committee.name}" (${committee.exam_date}): تحتاج ${neededBackup} احتياطي، متاح فقط ${toAssign.length}`
        )
      }

      toAssign.forEach(emp => {
        result.assignments.push({
          employee_id: emp.id,
          committee_id: committee.id,
          type: 'احتياطي',
        })
        load.set(emp.id, (load.get(emp.id) || 0) + 1)
      })
    }
  }

  return result
}
