import React, { useEffect, useState } from 'react'
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  Icon,
  Spinner,
  Text,
  useToast,
  Card,
  CardHeader,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  HStack,
  VStack,
  Divider,
  SimpleGrid,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Switch,
  FormHelperText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'
import { FiChevronRight, FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
// env import removed as it's no longer needed
import { SlackUserCacheProvider } from '../../components/slack/SlackUserContext'
import MessageText from '../../components/slack/MessageText'
import useIntegration from '../../context/useIntegration'
import integrationService, {
  IntegrationType,
  ServiceResource,
} from '../../lib/integrationService'
import { SlackAnalysisResult } from '../../lib/slackApiClient'

// Use the SlackAnalysisResult interface directly from slackApiClient.ts
type AnalysisResponse = SlackAnalysisResult

interface Channel extends ServiceResource {
  type: string
  topic?: string
  purpose?: string
  workspace_uuid?: string
  channel_uuid?: string
  external_resource_id?: string
}

/**
 * Page component for analyzing a channel from a team integration and displaying results.
 */
const TeamChannelAnalysisPage: React.FC = () => {
  const { integrationId, channelId } = useParams<{
    integrationId: string
    channelId: string
  }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChannelLoading, setIsChannelLoading] = useState(true)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [includeThreads, setIncludeThreads] = useState(true)
  const [includeReactions, setIncludeReactions] = useState(true)
  // Always use JSON mode by default - no toggle needed
  // Always JSON mode by default - no toggle needed and no variable needed
  const toast = useToast()
  const navigate = useNavigate()

  const { currentIntegration, fetchIntegration } = useIntegration()

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Format date for input fields
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Get analysis parameters from location state (if available from CreateAnalysisPage)
  const location = useLocation()

  // Set date range and options from location state or default values
  useEffect(() => {
    console.log('Location state changed:', location.state)

    // Check if parameters were passed from CreateAnalysisPage
    if (location.state) {
      const {
        startDate: startDateParam,
        endDate: endDateParam,
        includeThreads: includeThreadsParam,
        includeReactions: includeReactionsParam,
        useJsonMode: useJsonModeParam,
        _timestamp,
      } = location.state

      console.log('Applying parameters from location state:', {
        startDate: startDateParam,
        endDate: endDateParam,
        includeThreads: includeThreadsParam,
        includeReactions: includeReactionsParam,
        useJsonMode: useJsonModeParam,
        _timestamp,
      })

      // Show toast to indicate parameters received
      toast({
        title: 'Analysis Parameters Received',
        description: `Analyzing for period: ${new Date(startDateParam).toLocaleDateString()} - ${new Date(endDateParam).toLocaleDateString()}`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      })

      if (startDateParam) setStartDate(startDateParam)
      if (endDateParam) setEndDate(endDateParam)
      if (includeThreadsParam !== undefined)
        setIncludeThreads(includeThreadsParam)
      if (includeReactionsParam !== undefined)
        setIncludeReactions(includeReactionsParam)
      // JSON mode is always enabled now, so we don't need to set it from params
    } else {
      console.log('No location state, applying default date range')
      // Default date range (last 30 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(end))
    }
  }, [location.state, toast])

  // Fetch integration first to ensure it's loaded
  useEffect(() => {
    if (integrationId) {
      console.log('Loading integration:', integrationId)
      fetchIntegration(integrationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId])

  // Once integration is loaded, fetch channel info
  useEffect(() => {
    if (integrationId && channelId && currentIntegration) {
      console.log(
        'Integration loaded, fetching channel:',
        currentIntegration.id
      )
      // Only fetch if we don't already have the channel
      if (!channel) {
        fetchIntegrationAndChannel()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId, channelId, currentIntegration])

  /**
   * Fetch channel information only - integration must already be loaded.
   */
  const fetchIntegrationAndChannel = async () => {
    try {
      setIsChannelLoading(true)

      // Verify we have the integration and channel IDs
      if (!currentIntegration) {
        console.log('Integration not loaded yet - skipping channel fetch')
        return // Just return and wait for the next render when integration is loaded
      }

      if (!channelId) {
        console.error('Missing channel ID')
        return
      }

      console.log(
        'Fetching channel data using integration:',
        currentIntegration.id
      )

      // Get channel via the integration service
      const channelData = await integrationService.getResource(
        integrationId || '',
        channelId
      )

      // Check if the result is an API error
      if (integrationService.isApiError(channelData)) {
        throw new Error(`Failed to fetch channel: ${channelData.message}`)
      }

      console.log('Channel data retrieved successfully:', channelData.name)

      // Create enriched channel data with proper IDs for the API
      const enrichedChannel: Channel = {
        ...channelData,
        // Store the database UUIDs for API calls
        workspace_uuid: currentIntegration.id, // Database UUID for the workspace
        channel_uuid: channelData.id, // Database UUID for the channel
        external_id: currentIntegration.workspace_id || '', // Slack workspace ID
        external_resource_id: channelData.external_id, // Slack channel ID
        type:
          channelData.metadata?.type || channelData.metadata?.is_private
            ? channelData.metadata?.is_private
              ? 'private'
              : 'public'
            : 'public',
        topic:
          typeof channelData.metadata?.topic === 'string'
            ? channelData.metadata.topic
            : '',
        purpose:
          typeof channelData.metadata?.purpose === 'string'
            ? channelData.metadata.purpose
            : '',
      }

      setChannel(enrichedChannel)
    } catch (error) {
      console.error('Error fetching channel:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load channel information',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsChannelLoading(false)
    }
  }

  /**
   * Run channel analysis with current settings.
   */
  const runAnalysis = async () => {
    if (!integrationId || !channelId) {
      toast({
        title: 'Error',
        description: 'Missing integration or channel ID',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    try {
      setIsLoading(true)
      setAnalysis(null)

      // Format date parameters
      const startDateParam = startDate ? new Date(startDate).toISOString() : ''
      const endDateParam = endDate ? new Date(endDate).toISOString() : ''

      // Verify we have channel data
      if (!channel) {
        throw new Error('Channel data is required')
      }

      // Get current user's team ID (from context or route)
      // For now, assume it's the channel's workspace UUID
      const teamId = channel.workspace_uuid

      if (!teamId) {
        throw new Error('Team ID is required to create a report')
      }

      // Log the parameters we're using
      console.log('Creating channel report with parameters:', {
        teamId,
        channelId,
        startDate: startDateParam,
        endDate: endDateParam,
        includeThreads,
        includeReactions,
      })

      // Prepare channel data for the API call
      const channelData = {
        id: channelId,
        name: channel.name,
        integration_id: integrationId,
      }

      // Use the new API endpoint to create a report
      const result = await integrationService.createChannelReport(
        teamId, // Team ID
        [channelData], // Array with single channel
        {
          start_date: startDateParam || undefined,
          end_date: endDateParam || undefined,
          include_threads: includeThreads,
          include_reactions: includeReactions,
          analysis_type: 'contribution',
        },
        `Analysis of #${channel.name}`, // Custom title
        `Analysis of Slack channel #${channel.name} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}` // Custom description
      )

      // Check if the result is an error
      if (integrationService.isApiError(result)) {
        const errorMessage = `Analysis request failed: ${result.message}${result.detail ? `\nDetail: ${result.detail}` : ''}`
        console.error(errorMessage)
        throw new Error(errorMessage)
      }

      // Handle successful response
      console.log('Report created successfully:', result)

      // Set the analysis result, casting to the expected type
      // This is safe because we've verified it's not an ApiError above
      setAnalysis(result as unknown as SlackAnalysisResult)

      toast({
        title: 'Analysis Complete',
        description: 'Channel analysis has been completed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      // Navigate to the analysis result page if we have an analysis ID
      if (result.analysis_id) {
        navigate(
          `/dashboard/integrations/${integrationId}/channels/${channelId}/analysis/${result.analysis_id}`
        )
      }
      // Or navigate to the report page if we have a report ID
      else if (result.id) {
        navigate(
          `/dashboard/integrations/${integrationId}/team-analysis/${result.id}`
        )
      }
    } catch (error) {
      console.error('Error during analysis:', error)

      // Show a more detailed error message with actionable information
      toast({
        title: 'Analysis Failed',
        description:
          error instanceof Error ? error.message : 'Failed to analyze channel',
        status: 'error',
        duration: 10000,
        isClosable: true,
      })

      // If needed, show details about implementation status
      toast({
        title: 'API Information',
        description:
          'Using the newly implemented team-based channel analysis API endpoint. ' +
          'If you encounter issues, please report them.',
        status: 'info',
        duration: 10000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Extract and format content from the analysis result
   * This function handles both direct properties and nested JSON strings
   */
  const extractAndFormatContent = (
    analysis: AnalysisResponse,
    fieldName: keyof AnalysisResponse
  ) => {
    if (!analysis) return <Box>No analysis data available</Box>

    // Check if the field exists directly on the analysis object
    let content:
      | string
      | boolean
      | Record<string, unknown>
      | { start: string; end: string }
      | {
          message_count: number
          participant_count: number
          thread_count: number
          reaction_count: number
        }
      | undefined = analysis[fieldName]

    // If content doesn't exist, check if it might be in the result field
    if (!content && analysis.result && typeof analysis.result === 'object') {
      const result = analysis.result as Record<string, unknown>
      const fieldValue = result[fieldName as string]

      // Only assign if the type matches our expected types
      if (
        fieldValue === undefined ||
        typeof fieldValue === 'string' ||
        typeof fieldValue === 'boolean' ||
        (typeof fieldValue === 'object' && fieldValue !== null)
      ) {
        content = fieldValue as typeof content
      }
    }

    // If we found a string content, format it
    if (typeof content === 'string') {
      return formatText(content)
    }

    // Check if we have a raw result string that might be JSON
    if (analysis.result && typeof analysis.result === 'string') {
      try {
        // Try to parse the result as JSON
        const jsonResult = JSON.parse(analysis.result)
        if (jsonResult[fieldName as string]) {
          return formatText(jsonResult[fieldName as string])
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    return <Box>No data available for {fieldName}</Box>
  }

  /**
   * Format text with paragraphs and process Slack mentions.
   */
  const formatText = (text: string | undefined) => {
    if (!text) return <Box>No data available</Box>

    // Process the text into paragraphs
    return text.split('\n').map((paragraph, index) => (
      <Box key={index} mb={2}>
        {paragraph.trim() ? (
          <MessageText
            text={paragraph}
            workspaceUuid={channel?.external_id || ''}
            resolveMentions={true}
            fallbackToSimpleFormat={true}
          />
        ) : (
          <Box height="1em" />
        )}
      </Box>
    ))
  }

  /**
   * Render analysis parameters form.
   */
  const renderAnalysisForm = () => {
    return (
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">Analysis Parameters</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Flex justify="flex-end">
              <Button
                as={Link}
                to={`/dashboard/integrations/${integrationId}/channels/${channelId}/history`}
                size="sm"
                colorScheme="blue"
                variant="outline"
              >
                View Analysis History
              </Button>
            </Flex>
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormControl>
            </HStack>

            <HStack spacing={6}>
              <FormControl display="flex" alignItems="center">
                <Switch
                  id="include-threads"
                  isChecked={includeThreads}
                  onChange={(e) => setIncludeThreads(e.target.checked)}
                  colorScheme="purple"
                  mr={2}
                />
                <FormLabel htmlFor="include-threads" mb={0}>
                  Include Thread Replies
                </FormLabel>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <Switch
                  id="include-reactions"
                  isChecked={includeReactions}
                  onChange={(e) => setIncludeReactions(e.target.checked)}
                  colorScheme="purple"
                  mr={2}
                />
                <FormLabel htmlFor="include-reactions" mb={0}>
                  Include Reactions
                </FormLabel>
              </FormControl>
            </HStack>

            {/* JSON mode is now enabled by default and hidden from UI */}

            <FormControl>
              <FormHelperText>
                Select a date range and options for analysis. A larger date
                range will take longer to analyze.
              </FormHelperText>
            </FormControl>

            <Divider />

            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              colorScheme="purple"
              onClick={runAnalysis}
              isLoading={isLoading}
              loadingText="Analyzing..."
            >
              Run Analysis
            </Button>
          </VStack>
        </CardBody>
      </Card>
    )
  }

  /**
   * Render analysis results.
   */
  const renderAnalysisResults = () => {
    if (!analysis) return null

    return (
      <Box mt={8}>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading as="h2" size="lg">
            Analysis Results
          </Heading>
          {/* JSON mode badge removed since JSON mode is now the default */}
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Stat>
            <StatLabel>Messages</StatLabel>
            <StatNumber>{analysis.stats?.message_count || 0}</StatNumber>
            <StatHelpText>Total messages analyzed</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Participants</StatLabel>
            <StatNumber>{analysis.stats?.participant_count || 0}</StatNumber>
            <StatHelpText>Unique contributors</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Threads</StatLabel>
            <StatNumber>{analysis.stats?.thread_count || 0}</StatNumber>
            <StatHelpText>Conversation threads</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Reactions</StatLabel>
            <StatNumber>{analysis.stats?.reaction_count || 0}</StatNumber>
            <StatHelpText>Total emoji reactions</StatHelpText>
          </Stat>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Channel Summary</Heading>
            </CardHeader>
            <CardBody>
              {extractAndFormatContent(analysis, 'channel_summary')}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Topic Analysis</Heading>
            </CardHeader>
            <CardBody>
              {extractAndFormatContent(analysis, 'topic_analysis')}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Contributor Insights</Heading>
            </CardHeader>
            <CardBody>
              {extractAndFormatContent(analysis, 'contributor_insights')}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Key Highlights</Heading>
            </CardHeader>
            <CardBody>
              {extractAndFormatContent(analysis, 'key_highlights')}
            </CardBody>
          </Card>
        </SimpleGrid>

        <Box mt={4} p={3} borderRadius="md" bg="gray.50">
          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Analysis period:
            </Text>
            <Text fontSize="sm">
              {analysis.period?.start
                ? formatDate(analysis.period.start)
                : 'Unknown'}{' '}
              to{' '}
              {analysis.period?.end
                ? formatDate(analysis.period.end)
                : 'Unknown'}
            </Text>
          </HStack>

          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Model:
            </Text>
            <Text fontSize="sm">{analysis.model_used || 'Unknown'}</Text>
          </HStack>

          <HStack spacing={2}>
            <Text fontWeight="bold" fontSize="sm">
              Generated:
            </Text>
            <Text fontSize="sm">
              {analysis.generated_at
                ? new Date(analysis.generated_at).toLocaleString()
                : 'Unknown'}
            </Text>
          </HStack>
        </Box>
      </Box>
    )
  }

  if (!integrationId || !currentIntegration) {
    return (
      <Box textAlign="center" p={8}>
        <Heading size="md">Integration not found</Heading>
        <Button mt={4} as={Link} to="/dashboard/integrations">
          Back to Integrations
        </Button>
      </Box>
    )
  }

  // Show incompatible integration type
  if (currentIntegration.service_type !== IntegrationType.SLACK) {
    return (
      <Box>
        <Button
          leftIcon={<FiArrowLeft />}
          onClick={() => navigate(`/dashboard/integrations/${integrationId}`)}
          mb={4}
          variant="outline"
        >
          Back to Integration
        </Button>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Unsupported integration type</AlertTitle>
          <AlertDescription>
            Channel analysis is currently only available for Slack integrations.
          </AlertDescription>
        </Alert>
      </Box>
    )
  }

  return (
    <SlackUserCacheProvider workspaceId={channel?.external_id || ''}>
      <Box p={4}>
        {/* Breadcrumb navigation */}
        <Breadcrumb
          spacing="8px"
          separator={<Icon as={FiChevronRight} color="gray.500" />}
          mb={6}
        >
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} to="/dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} to="/dashboard/integrations">
              Integrations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink
              as={Link}
              to={`/dashboard/integrations/${integrationId}`}
            >
              {currentIntegration.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink
              as={Link}
              to={`/dashboard/integrations/${integrationId}/channels`}
            >
              Channels
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Channel Analysis</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Back button */}
        <Button
          leftIcon={<Icon as={FiArrowLeft} />}
          mb={6}
          onClick={() =>
            navigate(`/dashboard/integrations/${integrationId}/channels`)
          }
          variant="outline"
          colorScheme="purple"
        >
          Back to Channels
        </Button>

        {isChannelLoading ? (
          <Flex height="200px" justify="center" align="center">
            <Spinner size="xl" color="purple.500" thickness="4px" />
          </Flex>
        ) : (
          <>
            <Box mb={6}>
              <Heading as="h1" size="xl">
                Channel Analysis
              </Heading>
              <HStack mt={2} spacing={2}>
                <Text fontWeight="bold">{currentIntegration.name}</Text>
                <Text>&gt;</Text>
                <Text>#{channel?.name}</Text>
                <Badge
                  colorScheme={channel?.type === 'public' ? 'green' : 'orange'}
                >
                  {channel?.type}
                </Badge>
              </HStack>
              {channel?.topic && (
                <Text color="gray.600" mt={1}>
                  Topic: {channel.topic}
                </Text>
              )}
            </Box>

            {/* Analysis form */}
            {renderAnalysisForm()}

            {/* Loading state */}
            {isLoading && (
              <Flex justify="center" align="center" my={10} direction="column">
                <Spinner size="xl" color="purple.500" thickness="4px" mb={4} />
                <Text>
                  Analyzing channel messages... This may take a minute.
                </Text>
              </Flex>
            )}

            {/* Analysis results */}
            {analysis && renderAnalysisResults()}
          </>
        )}
      </Box>
    </SlackUserCacheProvider>
  )
}

export default TeamChannelAnalysisPage
