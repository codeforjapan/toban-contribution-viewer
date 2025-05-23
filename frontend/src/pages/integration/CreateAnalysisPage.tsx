import React, { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Circle,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  Badge,
} from '@chakra-ui/react'
import {
  FiArrowRight,
  FiArrowLeft,
  FiBarChart2,
  FiCalendar,
  FiChevronRight,
  FiFileText,
  FiMessageSquare,
  FiRefreshCw,
  FiSlack,
  FiUsers,
} from 'react-icons/fi'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import useAuth from '../../context/useAuth'
import useIntegration from '../../context/useIntegration'
import integrationService, {
  ServiceResource,
  ResourceType,
} from '../../lib/integrationService'
import TeamChannelSelector from '../../components/integration/TeamChannelSelector'

interface ChannelResource extends ServiceResource {
  type?: string
  is_private?: boolean
  member_count?: number
  metadata?: {
    [key: string]: unknown
  }
}

/**
 * CreateAnalysisPage component allows users to create a new analysis
 * by selecting date range and channels to analyze.
 */
const CreateAnalysisPage: React.FC = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const { teamId: teamIdFromPath } = useParams<{ teamId: string }>()
  const [searchParams] = useSearchParams()
  const teamIdFromQuery = searchParams.get('team')
  const { teamContext } = useAuth()

  // Use teamId from path params if available, otherwise from query params
  const teamIdFromUrl = teamIdFromPath || teamIdFromQuery

  // Try to get the team name if we have a team ID from the URL
  const currentTeam = teamIdFromUrl
    ? teamContext.teams?.find((team) => team.id === teamIdFromUrl)
    : null
  const teamName = currentTeam?.name || 'Team'
  const { integrations, fetchIntegrations } = useIntegration()

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSelectedChannelsLoading, setIsSelectedChannelsLoading] =
    useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  // Commented out unused state
  // const [searchTerm] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<string>('')
  const [resources, setResources] = useState<ChannelResource[]>([])
  const [allChannelResources, setAllChannelResources] = useState<
    ChannelResource[]
  >([])
  const [selectedForAnalysisChannels, setSelectedForAnalysisChannels] =
    useState<ChannelResource[]>([])
  const [showAllChannels] = useState(false)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>('')

  // Multi-step form state
  const [activeStep, setActiveStep] = useState(0)
  const totalSteps = 3

  // Analysis parameters
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [includeThreads, setIncludeThreads] = useState(true)
  const [includeReactions, setIncludeReactions] = useState(true)

  // Styles
  const bgHover = useColorModeValue('purple.50', 'purple.900')
  const borderColorHover = useColorModeValue('purple.300', 'purple.700')
  const selectedBg = useColorModeValue('purple.100', 'purple.800')

  // Step navigation functions
  const nextStep = () => {
    if (activeStep < totalSteps - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // Validation functions for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Integration selection
        return !!selectedIntegration
      case 1: // Channel selection
        return selectedChannels.length > 0 // Now we check for any selected channels
      case 2: // Analysis parameters
        return !!startDate && !!endDate
      default:
        return false
    }
  }

  // Style colors for loading state

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    setStartDate(formatDateForInput(start))
    setEndDate(formatDateForInput(end))
  }, [])

  // Load available integrations on page load
  useEffect(() => {
    // Use teamId from URL if available, otherwise fallback to current team from context
    const effectiveTeamId = teamIdFromUrl || teamContext?.currentTeamId || ''
    void fetchIntegrations(effectiveTeamId)
  }, [fetchIntegrations, teamContext?.currentTeamId, teamIdFromUrl])

  // Format date for input fields
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Toggle between showing all channels or only selected for analysis channels
  useEffect(() => {
    if (showAllChannels) {
      setResources(allChannelResources)
    } else {
      // Only show selected channels if there are any, otherwise show all
      setResources(
        selectedForAnalysisChannels.length > 0
          ? selectedForAnalysisChannels
          : allChannelResources
      )
    }
  }, [showAllChannels, allChannelResources, selectedForAnalysisChannels])

  /**
   * Fetch channels that have been selected for analysis
   */
  const fetchSelectedChannels = useCallback(async (integrationId: string) => {
    try {
      setIsSelectedChannelsLoading(true)

      // Get selected resources from the API
      // Use getSelectedChannels which is the correct method name
      const result = await integrationService.getSelectedChannels(integrationId)

      if (integrationService.isApiError(result)) {
        console.warn('Failed to load selected channels:', result.message)
        return
      }

      // Extract the IDs of selected channels, ensuring result is an array
      if (Array.isArray(result)) {
        const selectedIds = result.map((resource) => resource.id)
        setSelectedChannels(selectedIds)

        // If there's exactly one selected channel, pre-select it
        if (selectedIds.length === 1) {
          setSelectedChannel(selectedIds[0])
        }
      } else {
        console.warn('Expected array of results but got', typeof result)
        setSelectedChannels([])
      }
    } catch (error) {
      console.error('Error loading selected channels:', error)
    } finally {
      setIsSelectedChannelsLoading(false)
    }
  }, [])

  /**
   * Load resources (channels) for the selected integration
   */
  const loadIntegrationResources = useCallback(
    async (integrationId: string) => {
      try {
        setIsLoading(true)

        // Load all resources
        const result = await integrationService.getResources(integrationId)

        if (integrationService.isApiError(result)) {
          throw new Error(`Failed to load resources: ${result.message}`)
        }

        // Filter out just the channel resources
        const channelResources = result.filter(
          (resource) => resource.resource_type === 'slack_channel'
        ) as ChannelResource[]

        // Sort by name
        channelResources.sort((a, b) => a.name.localeCompare(b.name))

        // Save all channel resources
        setAllChannelResources(channelResources)

        // Log channel names and IDs for debugging
        console.log(
          'Available channels:',
          channelResources.map((c) => ({
            id: c.id,
            name: c.name,
            selected: c.metadata?.is_selected_for_analysis,
          }))
        )

        // Find channels that are selected for analysis
        const selectedChannelResources = channelResources.filter(
          (resource) => resource.metadata?.is_selected_for_analysis === true
        )

        // Save selected for analysis channels
        setSelectedForAnalysisChannels(selectedChannelResources)

        // Set displayed resources to only show selected channels by default
        setResources(
          selectedChannelResources.length > 0
            ? selectedChannelResources
            : channelResources
        )

        // After loading resources, fetch selected channels
        fetchSelectedChannels(integrationId)
      } catch (error) {
        console.error('Error loading resources:', error)
        toast({
          title: 'Error',
          description:
            error instanceof Error ? error.message : 'Failed to load channels',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, fetchSelectedChannels]
  )

  /**
   * Filter resources based on search term
   */
  // Commented out unused function
  // const filteredResources = resources.filter((resource) =>
  //   resource.name.toLowerCase().includes(searchTerm.toLowerCase())
  // )

  /**
   * Toggle channel selection for analysis
   */
  // Commented out unused function
  // const toggleChannelSelection = async (resourceId: string) => {
  //   if (!selectedIntegration) return

  //   try {
  //     const isCurrentlySelected = selectedChannels.includes(resourceId)
  //     const selectionAction = !isCurrentlySelected

  //     // Call the API to update the selection
  //     const result = await integrationService.selectChannelsForAnalysis(
  //       selectedIntegration,
  //       {
  //         channel_ids: [resourceId],
  //         for_analysis: selectionAction,
  //       }
  //     )

  //     if (integrationService.isApiError(result)) {
  //       throw new Error(
  //         `Failed to ${selectionAction ? 'select' : 'deselect'} channel: ${result.message}`
  //       )
  //     }

  //     // Update local state
  //     if (selectionAction) {
  //       setSelectedChannels([...selectedChannels, resourceId])
  //     } else {
  //       setSelectedChannels(selectedChannels.filter((id) => id !== resourceId))
  //     }

  //     toast({
  //       title: selectionAction ? 'Channel Selected' : 'Channel Deselected',
  //       description: `Channel ${selectionAction ? 'added to' : 'removed from'} analysis selection`,
  //       status: 'success',
  //       duration: 2000,
  //       isClosable: true,
  //     })

  //     // Refresh resources to update UI
  //     await loadIntegrationResources(selectedIntegration)
  //   } catch (error) {
  //     console.error('Error toggling channel selection:', error)
  //     toast({
  //       title: 'Selection Failed',
  //       description:
  //         error instanceof Error
  //           ? error.message
  //           : 'Failed to update channel selection',
  //       status: 'error',
  //       duration: 5000,
  //       isClosable: true,
  //     })
  //   }
  // }

  /**
   * Load the selected channel data
   */
  const loadSelectedChannelData = useCallback(
    async (resourceId: string) => {
      if (!selectedIntegration || !resourceId) return

      try {
        console.log(`Loading channel data for ${resourceId}`)

        // Get the channel data
        const channelData = await integrationService.getResource(
          selectedIntegration,
          resourceId
        )

        if (integrationService.isApiError(channelData)) {
          throw new Error(`Failed to fetch channel: ${channelData.message}`)
        }

        console.log('Channel data retrieved:', channelData)

        // Channel data loaded successfully
      } catch (error) {
        console.error('Error fetching channel data:', error)
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to load channel data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    },
    [selectedIntegration, toast]
  )

  // When a channel is selected, load its data
  useEffect(() => {
    if (selectedChannel) {
      loadSelectedChannelData(selectedChannel)
    }
  }, [selectedChannel, loadSelectedChannelData])

  // Debug log for selected channels
  useEffect(() => {
    if (selectedChannels.length > 0) {
      console.log('Selected channels:', selectedChannels)

      // Try to log the names too
      const names = selectedChannels.map((id) => {
        const channel = allChannelResources.find((r) => r.id === id)
        return channel ? `${id} (${channel.name})` : id
      })
      console.log('Selected channel names:', names)
    }
  }, [selectedChannels, allChannelResources])

  /**
   * Run channel analysis with current settings
   */
  const runAnalysis = async () => {
    if (!selectedIntegration || selectedChannels.length === 0) {
      toast({
        title: 'Selection Required',
        description:
          'Please select an integration and at least one channel to analyze',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      })
      return
    }

    try {
      setIsAnalyzing(true)

      // Format date parameters - use only date part without timezone
      // The backend expects dates without timezone info to avoid offset-aware vs offset-naive comparison issues
      const formatDateWithoutTimezone = (dateStr: string) => {
        const date = new Date(dateStr)
        // Format as YYYY-MM-DD with no timezone info
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }

      const startDateParam = startDate
        ? formatDateWithoutTimezone(startDate)
        : ''
      const endDateParam = endDate ? formatDateWithoutTimezone(endDate) : ''

      // Show toast to indicate analysis is starting
      toast({
        title: 'The report creation process successfully started',
        description:
          'Analysis is now processing. This may take several minutes depending on channel size.',
        status: 'success',
        duration: 8000,
        isClosable: true,
      })

      // Get the first channel from our selection
      const primaryChannel = selectedChannels[0]

      // Log the analysis parameters
      console.log('Running analysis with parameters:', {
        integrationId: selectedIntegration,
        channelId: primaryChannel,
        startDate: startDateParam,
        endDate: endDateParam,
        includeThreads,
        includeReactions,
      })

      // First - sync the channel data to ensure we have the latest messages
      try {
        // Specifically sync messages for this channel
        console.log(`Syncing messages for channel ${primaryChannel}...`)

        // Use the integrationService method for channel sync
        const syncOptions = {
          start_date:
            startDateParam ||
            formatDateWithoutTimezone(
              new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
            ),
          end_date:
            endDateParam || formatDateWithoutTimezone(new Date().toISOString()),
          include_replies: includeThreads,
        }

        const channelSyncResult = await integrationService.syncChannelMessages(
          selectedIntegration,
          primaryChannel,
          syncOptions
        )

        // Check if the result is an error
        if (integrationService.isApiError(channelSyncResult)) {
          toast({
            title: 'Channel Sync Warning',
            description: `Channel sync was not fully successful: ${channelSyncResult.message}. Analysis may not include the latest messages.`,
            status: 'warning',
            duration: 7000,
            isClosable: true,
          })
        } else {
          console.log('Channel messages sync successful:', channelSyncResult)

          // Extract sync statistics from the response
          const syncStats = channelSyncResult.sync_results || {}
          const newMessages =
            ((syncStats as Record<string, unknown>)
              .new_message_count as number) || 0
          const repliesCount =
            ((syncStats as Record<string, unknown>).replies_synced as number) ||
            0

          // Only show the sync message if there are actual messages synced
          if (newMessages > 0 || repliesCount > 0) {
            toast({
              title: 'Channel Data Updated',
              description: `Added ${newMessages} new messages and ${repliesCount} thread replies from Slack.`,
              status: 'info',
              duration: 3000,
              isClosable: true,
            })
          }

          // Log sync results but don't show toast if nothing new was synced
          console.log(
            `Sync complete: ${newMessages} messages, ${repliesCount} replies synced.`
          )
        }
      } catch (syncError) {
        console.error('Error syncing data:', syncError)
        toast({
          title: 'Sync Warning',
          description:
            syncError instanceof Error
              ? `Sync issue: ${syncError.message}. Analysis will use existing data.`
              : 'Failed to sync channel data. Analysis will use existing data.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      }

      // Prepare analysis options
      const analysisOptions = {
        analysis_type: 'contribution',
        start_date: startDateParam || undefined,
        end_date: endDateParam || undefined,
        include_threads: includeThreads,
        include_reactions: includeReactions,
      }

      // Prepare channel data for the unified createChannelReport method
      // Ensure selectedChannels is an array before mapping
      if (!Array.isArray(selectedChannels)) {
        console.error(
          'Invalid selectedChannels: Expected array but got',
          typeof selectedChannels
        )
        toast({
          title: 'Selection Error',
          description: 'Invalid channel selection format. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        return
      }

      const channelsForReport = selectedChannels.map((channelId) => {
        const channel = allChannelResources.find((r) => r.id === channelId)
        if (!channel) {
          console.warn(`Could not find details for channel ${channelId}`)
        }
        return {
          id: channelId,
          name: channel?.name || 'Unknown Channel',
          integration_id: selectedIntegration,
        }
      })

      console.log('Selected channels for analysis:', channelsForReport)

      // Show info about number of channels being analyzed
      toast({
        title: `Analyzing ${selectedChannels.length} channels`,
        description:
          selectedChannels.length > 1
            ? 'Multiple channels selected. Creating a cross-resource analysis.'
            : 'Analyzing single channel.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })

      // Use the unified method to create either a single or multi-channel report
      // First use teamId from URL if available, otherwise fallback to current team from context
      const teamId = teamIdFromUrl || teamContext?.currentTeamId
      if (!teamId) {
        throw new Error('No team ID available')
      }

      const result = await integrationService.createChannelReport(
        teamId,
        channelsForReport,
        analysisOptions
      )

      // Check for error
      if (integrationService.isApiError(result)) {
        const errorMessage = `Analysis failed: ${result.message}${result.detail ? `\nDetail: ${result.detail}` : ''}`
        console.error(errorMessage)
        throw new Error(errorMessage)
      }

      // Always go to team-analysis page
      const reportId = result.report_id || result.id
      const effectiveTeamId = teamId // We already have the validated teamId from above

      // Use the team-centric URL structure
      const redirectPath = `/dashboard/teams/${effectiveTeamId}/reports/${reportId}`

      // Notify user and redirect
      toast({
        title: 'Report generation process was started successfully',
        description: 'Redirecting to the detailed report page...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      // Redirect to the appropriate report page
      setTimeout(() => {
        navigate(redirectPath)
      }, 1500)
    } catch (error) {
      console.error('Error during analysis:', error)
      toast({
        title: 'Analysis Failed',
        description:
          error instanceof Error ? error.message : 'Failed to analyze channel',
        status: 'error',
        duration: 10000,
        isClosable: true,
      })
      // Only set isAnalyzing to false if there was an error
      // This keeps the button disabled after successful creation
      setIsAnalyzing(false)
    }
  }

  // Auto-sync function to trigger a sync when no channels are found
  const autoSyncIfNeeded = useCallback(
    async (integrationId: string) => {
      try {
        // Load resources first to check if sync needed
        setIsLoading(true)
        const result = await integrationService.getResources(integrationId)

        if (integrationService.isApiError(result)) {
          console.warn(
            'Error checking resources before auto-sync:',
            result.message
          )
          return false
        }

        // Filter to just channel resources
        const channels = result.filter(
          (r) => r.resource_type === 'slack_channel'
        )

        // If no channels found, trigger a sync automatically
        if (channels.length === 0) {
          console.log('No channels found, triggering automatic sync...')
          setIsSyncing(true)

          // Show toast to inform user
          toast({
            title: 'Auto-syncing channels',
            description:
              'No channels found. Syncing data from Slack automatically...',
            status: 'info',
            duration: 5000,
            isClosable: true,
          })

          // Perform the sync
          const syncResult = await integrationService.syncResources(
            integrationId,
            [ResourceType.SLACK_CHANNEL, ResourceType.SLACK_USER]
          )

          if (integrationService.isApiError(syncResult)) {
            console.warn('Auto-sync failed:', syncResult.message)
            return false
          }

          // Wait a moment for sync to start processing
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Load resources again after sync
          return true
        }

        return false
      } catch (error) {
        console.error('Error in autoSyncIfNeeded:', error)
        return false
      } finally {
        setIsLoading(false)
        setIsSyncing(false)
      }
    },
    [toast]
  )

  // When an integration is selected, load its resources
  useEffect(() => {
    if (selectedIntegration) {
      const loadResources = async () => {
        // First, load integration resources
        await loadIntegrationResources(selectedIntegration)

        // Check if auto-sync is needed
        if (allChannelResources.length === 0) {
          const didSync = await autoSyncIfNeeded(selectedIntegration)
          if (didSync) {
            // If we did sync, load resources again
            await loadIntegrationResources(selectedIntegration)
          }
        }
      }

      loadResources()
    }
  }, [
    selectedIntegration,
    loadIntegrationResources,
    allChannelResources.length,
    autoSyncIfNeeded,
  ])

  return (
    <Box width="100%">
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

        {teamIdFromUrl ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} to="/dashboard/teams">
                Teams
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                to={`/dashboard/teams/${teamIdFromUrl}`}
              >
                {teamName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                to={`/dashboard/teams/${teamIdFromUrl}/reports/history`}
              >
                Analysis History
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} to="/dashboard/analytics">
              Analytics
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}

        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Create Analysis</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Heading as="h1" size="xl" mb={6}>
        Create New Analysis
      </Heading>

      {/* Step indicator */}
      <Flex mb={8} justify="center">
        <HStack spacing={8} width={{ base: '100%', md: '80%' }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <Flex
              key={index}
              flex={1}
              direction="column"
              alignItems="center"
              position="relative"
            >
              {/* Connector line */}
              {index < totalSteps - 1 && (
                <Box
                  position="absolute"
                  height="2px"
                  bg={index < activeStep ? 'purple.500' : 'gray.200'}
                  right="-50%"
                  top="14px"
                  width="100%"
                  zIndex={1}
                />
              )}

              {/* Step circle */}
              <Circle
                size="30px"
                bg={
                  index < activeStep
                    ? 'purple.500'
                    : index === activeStep
                      ? 'purple.200'
                      : 'gray.200'
                }
                color={
                  index < activeStep
                    ? 'white'
                    : index === activeStep
                      ? 'purple.600'
                      : 'gray.500'
                }
                fontWeight="bold"
                mb={2}
                zIndex={2}
              >
                {index + 1}
              </Circle>

              {/* Step label */}
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={index <= activeStep ? 'purple.600' : 'gray.500'}
              >
                {index === 0
                  ? 'Select Workspace'
                  : index === 1
                    ? 'Select Channel'
                    : 'Configure'}
              </Text>
            </Flex>
          ))}
        </HStack>
      </Flex>

      {/* Step 1: Select Workspace */}
      {activeStep === 0 && (
        <Card variant="outline" mb={6} maxWidth="800px" mx="auto">
          <CardHeader pb={2}>
            <Heading size="md">Step 1: Select Workspace</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text>Choose the Slack workspace you'd like to analyze.</Text>

              <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                {integrations.map((integration) => (
                  <Box
                    key={integration.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => setSelectedIntegration(integration.id)}
                    bg={
                      selectedIntegration === integration.id
                        ? selectedBg
                        : 'transparent'
                    }
                    borderColor={
                      selectedIntegration === integration.id
                        ? borderColorHover
                        : 'inherit'
                    }
                    _hover={{ bg: bgHover, borderColor: borderColorHover }}
                    transition="all 0.2s"
                  >
                    <VStack spacing={3}>
                      <Icon as={FiSlack} color="purple.500" boxSize={6} />
                      <Text fontWeight="medium">{integration.name}</Text>
                    </VStack>
                  </Box>
                ))}

                {integrations.length === 0 && (
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    gridColumn="span 3"
                  >
                    <VStack>
                      <Text>No integrations available</Text>
                      <Button
                        as={Link}
                        to="/dashboard/integrations"
                        size="sm"
                        colorScheme="purple"
                        mt={2}
                      >
                        Connect Workspace
                      </Button>
                    </VStack>
                  </Box>
                )}
              </SimpleGrid>
            </VStack>
          </CardBody>
          <Divider />
          <CardFooter justifyContent="flex-end">
            <Button
              rightIcon={<Icon as={FiArrowRight} />}
              colorScheme="purple"
              onClick={nextStep}
              isDisabled={!isStepValid(0)}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Select Channels */}
      {activeStep === 1 && (
        <Card variant="outline" mb={6} maxWidth="800px" mx="auto">
          <CardHeader pb={2}>
            <Heading size="md">Step 2: Select Channels</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text>
                Choose the Slack channels you'd like to analyze. You can select
                multiple channels for cross-resource analysis.
              </Text>

              {isLoading || isSelectedChannelsLoading ? (
                <Flex
                  direction="column"
                  justify="center"
                  align="center"
                  py={8}
                  gap={4}
                >
                  <Spinner size="md" color="purple.500" />
                  <VStack spacing={2}>
                    <Text fontWeight="medium">
                      {isLoading
                        ? 'Loading channels...'
                        : 'Loading selected channels...'}
                    </Text>
                    <Text
                      color="gray.600"
                      fontSize="sm"
                      maxW="450px"
                      textAlign="center"
                    >
                      {isLoading && allChannelResources.length === 0
                        ? 'This may take a moment if this is the first time loading this workspace.'
                        : 'Preparing channel selection options...'}
                    </Text>
                  </VStack>

                  {/* Show sync button if loading is taking a while and no channels found */}
                  {isLoading && allChannelResources.length === 0 && (
                    <Button
                      mt={4}
                      colorScheme="purple"
                      size="sm"
                      isLoading={isSyncing}
                      onClick={async () => {
                        if (!selectedIntegration) return

                        try {
                          setIsSyncing(true)
                          // Use integrationService to sync resources
                          const result = await integrationService.syncResources(
                            selectedIntegration,
                            [
                              ResourceType.SLACK_CHANNEL,
                              ResourceType.SLACK_USER,
                            ]
                          )

                          if (integrationService.isApiError(result)) {
                            throw new Error(`Sync failed: ${result.message}`)
                          }

                          toast({
                            title: 'Channel sync started',
                            description:
                              'Refreshing channel data from Slack. This may take a moment.',
                            status: 'info',
                            duration: 5000,
                            isClosable: true,
                          })

                          // Reload the resources after a short delay
                          setTimeout(() => {
                            loadIntegrationResources(selectedIntegration)
                          }, 2000)
                        } catch (error) {
                          console.error('Error syncing channels:', error)
                          toast({
                            title: 'Sync failed',
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Failed to sync channels',
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                          })
                        } finally {
                          setIsSyncing(false)
                        }
                      }}
                    >
                      Sync Channels from Slack
                    </Button>
                  )}
                </Flex>
              ) : allChannelResources.length === 0 ? (
                <Box py={6} textAlign="center">
                  <VStack spacing={6}>
                    <Text>
                      No channels found for this workspace. You need to sync
                      channels first.
                    </Text>
                    <Button
                      colorScheme="purple"
                      leftIcon={<FiRefreshCw />}
                      isLoading={isSyncing}
                      onClick={async () => {
                        if (!selectedIntegration) return

                        try {
                          setIsSyncing(true)
                          // Use integrationService to sync resources
                          const result = await integrationService.syncResources(
                            selectedIntegration,
                            [
                              ResourceType.SLACK_CHANNEL,
                              ResourceType.SLACK_USER,
                            ]
                          )

                          if (integrationService.isApiError(result)) {
                            throw new Error(`Sync failed: ${result.message}`)
                          }

                          toast({
                            title: 'Channel sync started',
                            description:
                              'Refreshing channel data from Slack. This may take a moment.',
                            status: 'info',
                            duration: 5000,
                            isClosable: true,
                          })

                          // Reload the resources after a short delay
                          setTimeout(() => {
                            loadIntegrationResources(selectedIntegration)
                          }, 2000)
                        } catch (error) {
                          console.error('Error syncing channels:', error)
                          toast({
                            title: 'Sync failed',
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Failed to sync channels',
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                          })
                        } finally {
                          setIsSyncing(false)
                        }
                      }}
                    >
                      Sync Channels from Slack
                    </Button>
                  </VStack>
                </Box>
              ) : (
                <Box>
                  {/* Use our TeamChannelSelector with multiSelect mode */}
                  <TeamChannelSelector
                    integrationId={selectedIntegration}
                    multiSelect={true}
                    onSelectionChange={(selectedIds) => {
                      console.log('Channel selection changed:', selectedIds)
                      setSelectedChannels(selectedIds)
                      // Ensure we have loaded the channel resources for all selected channels
                      if (
                        selectedIds.length > 0 &&
                        allChannelResources.length > 0
                      ) {
                        const unrecognizedChannels = selectedIds.filter(
                          (id) => !allChannelResources.some((r) => r.id === id)
                        )
                        if (unrecognizedChannels.length > 0) {
                          console.warn(
                            'Some selected channels are not in allChannelResources:',
                            unrecognizedChannels
                          )
                          // Reload all resources to ensure we have the latest
                          loadIntegrationResources(selectedIntegration)
                        }
                      }
                    }}
                    initialSelection={selectedChannels}
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
          <Divider />
          <CardFooter justifyContent="space-between">
            <Button
              leftIcon={<Icon as={FiArrowLeft} />}
              variant="outline"
              onClick={prevStep}
            >
              Back
            </Button>
            <Button
              rightIcon={<Icon as={FiArrowRight} />}
              colorScheme="purple"
              onClick={nextStep}
              isDisabled={!isStepValid(1)}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Analysis Parameters */}
      {activeStep === 2 && (
        <Card variant="outline" mb={6} maxWidth="800px" mx="auto">
          <CardHeader pb={2}>
            <Heading size="md">
              Step 3: Configure Analysis{' '}
              {selectedChannels.length > 1 &&
                `(${selectedChannels.length} Channels)`}
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Text>Set your analysis parameters and options.</Text>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Start Date</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FiCalendar} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>End Date</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FiCalendar} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </InputGroup>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Analysis Options</FormLabel>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={2}>
                  <Checkbox
                    isChecked={includeThreads}
                    onChange={(e) => setIncludeThreads(e.target.checked)}
                    colorScheme="purple"
                  >
                    Include Thread Replies
                  </Checkbox>

                  <Checkbox
                    isChecked={includeReactions}
                    onChange={(e) => setIncludeReactions(e.target.checked)}
                    colorScheme="purple"
                  >
                    Include Reactions
                  </Checkbox>
                </SimpleGrid>
              </FormControl>

              {/* Selected Channels Display */}
              <Box
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor="purple.200"
              >
                <Heading size="sm" mb={3}>
                  Selected Channels ({selectedChannels.length}):
                </Heading>

                {selectedChannels.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    No channels selected
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    <Flex wrap="wrap" gap={2}>
                      {selectedChannels.map((channelId) => {
                        // Try to find channel name from different sources
                        // First check in all channel resources (most reliable)
                        const channel = allChannelResources.find(
                          (r) => r.id === channelId
                        )
                        // Get channel name, fallback to filtered resources, then default to ID
                        const channelName =
                          channel?.name ||
                          resources.find((r) => r.id === channelId)?.name ||
                          'Unknown Channel'

                        // Log for debugging
                        if (!channel) {
                          console.warn(
                            `Could not find channel ${channelId} in resources`
                          )
                        }

                        return (
                          <Badge
                            key={channelId}
                            colorScheme="purple"
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            #{channelName}
                          </Badge>
                        )
                      })}
                    </Flex>

                    {/* Debug info - lists all channel IDs in text form */}
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Selected IDs: {selectedChannels.join(', ')}
                    </Text>
                  </VStack>
                )}
              </Box>

              <Box bg="purple.50" p={4} borderRadius="md">
                <Heading size="sm" mb={3}>
                  Analysis will include:
                </Heading>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiFileText} color="purple.500" />
                      <Text fontWeight="medium">Channel Summary</Text>
                    </HStack>
                    <Text fontSize="sm" pl={6}>
                      Overall activity patterns and main discussion topics
                    </Text>
                  </VStack>

                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiBarChart2} color="purple.500" />
                      <Text fontWeight="medium">Topic Analysis</Text>
                    </HStack>
                    <Text fontSize="sm" pl={6}>
                      Key topics and themes discussed in the channel
                    </Text>
                  </VStack>

                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiUsers} color="purple.500" />
                      <Text fontWeight="medium">Contributor Insights</Text>
                    </HStack>
                    <Text fontSize="sm" pl={6}>
                      Participation patterns and key contributors
                    </Text>
                  </VStack>

                  <VStack align="start" spacing={2}>
                    <HStack>
                      <Icon as={FiMessageSquare} color="purple.500" />
                      <Text fontWeight="medium">Key Highlights</Text>
                    </HStack>
                    <Text fontSize="sm" pl={6}>
                      Important discussions and significant threads
                    </Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              <Text fontSize="sm" color="gray.600">
                Analysis typically takes 1-2 minutes to complete depending on
                channel volume. We'll notify you when results are ready.
              </Text>
            </VStack>
          </CardBody>
          <Divider />
          <CardFooter justifyContent="space-between">
            <Button
              leftIcon={<Icon as={FiArrowLeft} />}
              variant="outline"
              onClick={prevStep}
            >
              Back
            </Button>
            <Button
              rightIcon={<Icon as={isAnalyzing ? undefined : FiArrowRight} />}
              colorScheme="purple"
              onClick={runAnalysis}
              isDisabled={!isStepValid(2) || isAnalyzing}
              isLoading={isAnalyzing}
              loadingText="Running Analysis..."
            >
              Run Analysis!
            </Button>
          </CardFooter>
        </Card>
      )}
      {/* Processing Indicator */}
      {isAnalyzing && (
        <Box maxWidth="800px" mx="auto">
          <Card
            mb={6}
            bgColor="purple.50"
            boxShadow="lg"
            position="relative"
            sx={{
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0px rgba(159, 122, 234, 0.7)' },
                '70%': { boxShadow: '0 0 0 15px rgba(159, 122, 234, 0)' },
                '100%': { boxShadow: '0 0 0 0px rgba(159, 122, 234, 0)' },
              },
            }}
          >
            <CardBody>
              <Flex direction="column" align="center" justify="center" py={8}>
                <Box position="relative" mb={4}>
                  <Spinner
                    size="xl"
                    color="purple.500"
                    thickness="4px"
                    speed="0.8s"
                  />
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    fontSize="sm"
                    fontWeight="bold"
                    color="purple.600"
                  >
                    LLM
                  </Box>
                </Box>

                <Heading size="md" mb={2} color="purple.700">
                  Analyzing Channel Data
                </Heading>
                <Text textAlign="center" maxW="lg" mb={3}>
                  Analysis is in progress. This process may take several minutes
                  for large channels with many messages.
                </Text>

                <Box p={3} bg="white" borderRadius="md" width="100%" maxW="lg">
                  <Heading size="xs" mb={2} color="purple.600">
                    Processing Steps:
                  </Heading>
                  <HStack mb={1}>
                    <Icon as={FiMessageSquare} color="green.500" />
                    <Text fontSize="sm">Retrieving channel messages</Text>
                  </HStack>
                  <HStack mb={1}>
                    <Icon as={FiUsers} color="purple.500" />
                    <Text fontSize="sm">Analyzing communication patterns</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FiBarChart2} color="blue.500" />
                    <Text fontSize="sm">
                      Generating insights and recommendations
                    </Text>
                  </HStack>
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </Box>
      )}

      {/* We no longer show results here as we're redirecting to the detail page */}
    </Box>
  )
}

export default CreateAnalysisPage
