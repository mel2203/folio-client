import { getArAging } from '../api/reports.js'
import AgingReportPage from './AgingReportPage.jsx'

function ArAging() {
  return <AgingReportPage direction="receivable" getReport={getArAging} />
}

export default ArAging
