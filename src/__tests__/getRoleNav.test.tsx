import { describe, it, expect } from 'vitest'
import { getRoleNav } from '@/components/medi/RoleSidebar'

describe('getRoleNav', () => {
  it('returns items for patient role', () => {
    const items = getRoleNav('patient')
    expect(items.length).toBeGreaterThan(0)
    expect(items.some(i => i.to.startsWith('/patient'))).toBeTruthy()
  })
})
