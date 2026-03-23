import { Employee, Committee, Assignment, ReserveAssignment } from './supabase'

export type DistributionMode = 'sequential' | 'random'

export interface ReserveConfig {
  morningCount: number
  eveningCount: number
}

export interface DistributionResult {
  assignments: { employee_id: string; committee_id: string; type: 'أساسي' | 'احتياطي' }[]
  reserves: { employee_id: string; exam_date: string; scope: 'صباحي' | 'مسائي' | 'يوم كامل' }[]
  warnings: string[]
}

/**
 * Determine the period of a committee based on its start time.
 * @param morningEnd - the end time of the morning period (default '14:00')
 */
function getPeriod(startTime: string, morningEnd: string = '14:00'): 'صباحي' | 'مسائي' {
  return startTime < morningEnd ? 'صباحي' : 'مسائي'
}

/**
 * Auto-distribute employees across committees + reserve assignments.
 * Rules:
 *  - Each committee needs `main_observers` main observers
 *  - Reserve employees assigned per period (morning/evening) based on `backup_observers`
 *  - A reserve employee must NOT be a main observer in any committee in that same period
 *  - No employee can be in two committees at the same time (overlapping times on same day)
 *  - Try to balance load (fewest assignments first)
 *  - Respect sequential vs random mode
 */
export function autoDistribute(
  employees: Employee[],
  committees: Committee[],
  existingAssignments: Assignment[],
  mode: DistributionMode,
  existingReserves: ReserveAssignment[] = [],
  reserveConfig?: ReserveConfig,
  morningEnd: string = '14:00'
): DistributionResult {
  const result: DistributionResult = { assignments: [], reserves: [], warnings: [] }

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
  existingReserves.forEach(r => {
    load.set(r.employee_id, (load.get(r.employee_id) || 0) + 1)
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
      available = available.sort(() => Math.random() - 0.5)
    } else {
      available = available.sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))
    }

    return available
  }

  // ─── STEP 1: Distribute main observers ───
  for (const committee of sortedCommittees) {
    const existingMain = existingAssignments.filter(
      a => a.committee_id === committee.id && a.type === 'أساسي'
    ).length + result.assignments.filter(
      a => a.committee_id === committee.id && a.type === 'أساسي'
    ).length

    const neededMain = committee.main_observers - existingMain

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
  }

  // ─── STEP 2: Distribute reserve employees ───
  if (reserveConfig && (reserveConfig.morningCount > 0 || reserveConfig.eveningCount > 0)) {
    // User-specified reserve counts per period
    const periodCounts: { period: 'صباحي' | 'مسائي'; count: number }[] = []
    if (reserveConfig.morningCount > 0) periodCounts.push({ period: 'صباحي', count: reserveConfig.morningCount })
    if (reserveConfig.eveningCount > 0) periodCounts.push({ period: 'مسائي', count: reserveConfig.eveningCount })

    // Get unique dates that have committees
    const uniqueDates = [...new Set(sortedCommittees.map(c => c.exam_date))]

    for (const date of uniqueDates) {
      for (const { period, count: userCount } of periodCounts) {
        // Check if this date actually has committees in this period
        const periodCommittees = sortedCommittees.filter(
          c => c.exam_date === date && getPeriod(c.start_time, morningEnd) === period
        )
        if (periodCommittees.length === 0) continue

        // Count existing reserves for this date+period
        const existingCount = existingReserves.filter(
          r => r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
        ).length + result.reserves.filter(
          r => r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
        ).length

        const stillNeeded = userCount - existingCount
        if (stillNeeded <= 0) continue

        // Employees already assigned as main in this period
        const mainInPeriod = new Set<string>()
        for (const c of periodCommittees) {
          existingAssignments
            .filter(a => a.committee_id === c.id && a.type === 'أساسي')
            .forEach(a => mainInPeriod.add(a.employee_id))
          result.assignments
            .filter(a => a.committee_id === c.id && a.type === 'أساسي')
            .forEach(a => mainInPeriod.add(a.employee_id))
        }

        // Employees already reserved for this date+period
        const alreadyReserved = new Set([
          ...existingReserves.filter(r =>
            r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
          ).map(r => r.employee_id),
          ...result.reserves.filter(r =>
            r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
          ).map(r => r.employee_id),
        ])

        let available = employees.filter(e =>
          !mainInPeriod.has(e.id) && !alreadyReserved.has(e.id)
        )

        if (mode === 'random') {
          available = available.sort(() => Math.random() - 0.5)
        } else {
          available = available.sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))
        }

        const toAssign = available.slice(0, stillNeeded)

        if (toAssign.length < stillNeeded) {
          result.warnings.push(
            `احتياطي ${period} (${date}): مطلوب ${stillNeeded}، متاح فقط ${toAssign.length}`
          )
        }

        toAssign.forEach(emp => {
          result.reserves.push({
            employee_id: emp.id,
            exam_date: date,
            scope: period,
          })
          load.set(emp.id, (load.get(emp.id) || 0) + 1)
        })
      }
    }
  } else if (!reserveConfig) {
    // Fallback: old behavior using backup_observers from committees
    const datePeriodsMap = new Map<string, { date: string; period: 'صباحي' | 'مسائي'; totalBackup: number }[]>()

    for (const c of sortedCommittees) {
      const period = getPeriod(c.start_time, morningEnd)
      const key = `${c.exam_date}|${period}`

      if (!datePeriodsMap.has(key)) {
        datePeriodsMap.set(key, [])
      }
      datePeriodsMap.get(key)!.push({ date: c.exam_date, period, totalBackup: c.backup_observers })
    }

    for (const [key, items] of datePeriodsMap) {
      const [date, period] = key.split('|') as [string, 'صباحي' | 'مسائي']

      const neededReserves = Math.max(...items.map(i => i.totalBackup))

      const existingCount = existingReserves.filter(
        r => r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
      ).length + result.reserves.filter(
        r => r.exam_date === date && (r.scope === period || r.scope === 'يوم كامل')
      ).length

      const stillNeeded = neededReserves - existingCount
      if (stillNeeded <= 0) continue

      const periodCommittees = sortedCommittees.filter(
        c => c.exam_date === date && getPeriod(c.start_time, morningEnd) === period
      )

      const mainInPeriod = new Set<string>()
      for (const c of periodCommittees) {
        existingAssignments
          .filter(a => a.committee_id === c.id && a.type === 'أساسي')
          .forEach(a => mainInPeriod.add(a.employee_id))
        result.assignments
          .filter(a => a.committee_id === c.id && a.type === 'أساسي')
          .forEach(a => mainInPeriod.add(a.employee_id))
      }

      const alreadyReserved = new Set([
        ...existingReserves.filter(r =>
          r.exam_date === date && (
            r.scope === period ||
            r.scope === 'يوم كامل'
          )
        ).map(r => r.employee_id),
        ...result.reserves.filter(r =>
          r.exam_date === date && (
            r.scope === period ||
            r.scope === 'يوم كامل'
          )
        ).map(r => r.employee_id),
      ])

      let available = employees.filter(e =>
        !mainInPeriod.has(e.id) && !alreadyReserved.has(e.id)
      )

      if (mode === 'random') {
        available = available.sort(() => Math.random() - 0.5)
      } else {
        available = available.sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))
      }

      const toAssign = available.slice(0, stillNeeded)

      if (toAssign.length < stillNeeded) {
        result.warnings.push(
          `احتياطي ${period} (${date}): مطلوب ${stillNeeded}، متاح فقط ${toAssign.length}`
        )
      }

      toAssign.forEach(emp => {
        result.reserves.push({
          employee_id: emp.id,
          exam_date: date,
          scope: period,
        })
        load.set(emp.id, (load.get(emp.id) || 0) + 1)
      })
    }
  }

  return result
}
