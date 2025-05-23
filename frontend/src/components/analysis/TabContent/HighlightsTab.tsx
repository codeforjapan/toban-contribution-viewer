import React from 'react'
import { Card, CardBody } from '@chakra-ui/react'
import { renderPlainText } from '../../../utils/textRenderer'
import { TabContentProps } from './types'
import { ChannelAnalysisList } from '../../common'

/**
 * Tab content for highlights analysis
 */
const HighlightsTab: React.FC<TabContentProps> = ({
  analysis,
  processedAnalysis,
  reportResult,
  isTeamAnalysis,
  workspaceUuid,
}) => {
  return (
    <>
      <Card variant="outline">
        <CardBody>
          {processedAnalysis?.fixedKeyHighlights
            ? renderPlainText(
                processedAnalysis.fixedKeyHighlights,
                String(workspaceUuid || '')
              )
            : renderPlainText(
                analysis?.key_highlights || 'No highlights available',
                String(workspaceUuid || '')
              )}
        </CardBody>
      </Card>

      {/* For team analysis, show individual channel highlights */}
      {isTeamAnalysis && reportResult && (
        <ChannelAnalysisList
          title="Channel Highlights"
          reportResult={reportResult}
          currentResources={[]}
          integrationId=""
          contentField="key_highlights"
          emptyMessage="No highlights available for individual channels."
        />
      )}
    </>
  )
}

export default HighlightsTab
