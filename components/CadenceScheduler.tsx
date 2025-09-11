// Refactored: we now re-export the new modular Scheduler component. Keeping a minimal shim for backward compatibility if imported elsewhere.
import Scheduler from './scheduler/Scheduler'

// Legacy export compatibility: older code imported { CadenceSelection } from this file.
// Provide a minimal type alias & dummy component mapping if still referenced. New implementation should migrate to <Scheduler />.
export type CadenceSelection = any

export default Scheduler
