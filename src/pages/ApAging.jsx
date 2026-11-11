import { getApAging } from '../api/reports.js'
import AgingReportPage from './AgingReportPage.jsx'

function ApAging() {
  return <AgingReportPage direction="payable" getReport={getApAging} />
}

export default ApAging
