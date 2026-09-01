param location string
param frontDoorId string
param deploymentPrincipalObjectId string
param alertActionGroupResourceId string
param communicationSenderRoleDefinitionId string
param serviceConfig object
param secretNames object
param policyConfig object
param tags object

var suffix = uniqueString(resourceGroup().id)
var storageAccountName = 'sthmbrief${suffix}'
var functionAppName = 'fn-hm-briefs-${suffix}'
var servicePlanName = 'asp-hm-briefs-${suffix}'
var runtimeIdentityName = 'uai-hm-briefs-runtime-${suffix}'
// Key Vault names are globally unique and capped at 24 characters.
var keyVaultName = 'kvhm${suffix}'
var emailServiceName = 'email-hm-briefs-${suffix}'
var communicationServiceName = 'acs-hm-briefs-${suffix}'
var logWorkspaceName = 'log-hm-briefs-${suffix}'
var appInsightsName = 'appi-hm-briefs-${suffix}'
var storageSuffix = environment().suffixes.storage
var keyVaultSuffix = environment().suffixes.keyvaultDns
var functionResourceId = resourceId('Microsoft.Web/sites', functionAppName)
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var queueDataContributorRoleId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
// Flex Consumption emits a small, exact lifecycle sequence during normal
// scale-in. Keep suppression conservative: require the Function role and
// resource, a non-empty worker instance, and one of the two known patterns
// across this alert's ten-minute window. Any other exception/trace remains
// alertable, including the same lifecycle messages without an instance.
var functionFailureQuery = 'let benignSigtermMessages=dynamic(["node exited with code 143", "node exited with code 143 (SIGTERM)", "node exited with code 143 (0x8F)"]); let workerExitPrefix="Language Worker Process exited. Pid="; let eventStreamMessage="Exception encountered while listening to EventStream"; let connectionAbortedProblemId="Microsoft.AspNetCore.Connections.ConnectionAbortedException at Grpc.AspNetCore.Server.Internal.PipeExtensions+<ReadStreamMessageAsync>d__15`1.MoveNext"; let expectedAppRoleName="${functionAppName}"; let expectedResourceId="${functionResourceId}"; let recentFailures = union isfuzzy=true (AppExceptions | project TimeGenerated, AppRoleInstance=tostring(column_ifexists("AppRoleInstance", "")), AppRoleName=tostring(column_ifexists("AppRoleName", "")), _ResourceId=tostring(column_ifexists("_ResourceId", "")), RawMessage=tostring(column_ifexists("Message", "")), ExceptionMessageValue=tostring(column_ifexists("ExceptionMessage", "")), ExceptionOuterMessage=tostring(column_ifexists("OuterMessage", "")), ExceptionInnermostMessage=tostring(column_ifexists("InnermostMessage", "")), ExceptionProblemId=tostring(column_ifexists("ProblemId", "")), FailureCount=tolong(coalesce(column_ifexists("ItemCount", 1), 1)), IsLifecycleTrace=false, IsException=true), (AppTraces | where SeverityLevel >= 3 | project TimeGenerated, AppRoleInstance=tostring(column_ifexists("AppRoleInstance", "")), AppRoleName=tostring(column_ifexists("AppRoleName", "")), _ResourceId=tostring(column_ifexists("_ResourceId", "")), RawMessage=tostring(column_ifexists("Message", "")), ExceptionMessageValue="", ExceptionOuterMessage="", ExceptionInnermostMessage="", ExceptionProblemId="", FailureCount=tolong(coalesce(column_ifexists("ItemCount", 1), 1)), IsLifecycleTrace=true, IsException=false) | extend AlertMessage=tostring(case(isnotempty(RawMessage), RawMessage, isnotempty(ExceptionMessageValue), ExceptionMessageValue, isnotempty(ExceptionOuterMessage), ExceptionOuterMessage, isnotempty(ExceptionInnermostMessage), ExceptionInnermostMessage, isnotempty(ExceptionProblemId), ExceptionProblemId, "")) | where TimeGenerated > ago(10m) and AppRoleName == expectedAppRoleName and tolower(_ResourceId) == tolower(expectedResourceId) | extend IsBenignSigterm=IsException and AlertMessage in (benignSigtermMessages), IsBenignWorkerExit=IsLifecycleTrace and AlertMessage startswith workerExitPrefix and AlertMessage endswith "." and strlen(AlertMessage) > strlen(workerExitPrefix) + 1 and isnotnull(toint(substring(AlertMessage, strlen(workerExitPrefix), strlen(AlertMessage) - strlen(workerExitPrefix) - 1))), IsBenignEventStream=IsLifecycleTrace and AlertMessage == eventStreamMessage, IsBenignConnectionAbort=IsException and ExceptionOuterMessage == "The request stream was aborted." and ExceptionInnermostMessage == "The HTTP/2 connection faulted." and ExceptionProblemId == connectionAbortedProblemId | extend IsBenignLifecycle=IsBenignSigterm or IsBenignWorkerExit or IsBenignEventStream or IsBenignConnectionAbort; let benignLifecycleKeys = recentFailures | where isnotempty(AppRoleInstance) | summarize benignSigtermCount=countif(IsBenignSigterm), benignWorkerExitCount=countif(IsBenignWorkerExit), benignEventStreamCount=countif(IsBenignEventStream), benignConnectionAbortCount=countif(IsBenignConnectionAbort), nonLifecycleCount=countif(not(IsBenignLifecycle)) by _ResourceId, AppRoleName, AppRoleInstance | where (benignSigtermCount == 1 and benignWorkerExitCount == 1 and benignConnectionAbortCount <= 1 and benignEventStreamCount <= 1 and nonLifecycleCount == 0) or (benignSigtermCount == 0 and benignWorkerExitCount == 0 and benignConnectionAbortCount == 1 and benignEventStreamCount == 1 and nonLifecycleCount == 0) | project _ResourceId, AppRoleName, AppRoleInstance, HasBenignLifecyclePair=true; recentFailures | join kind=leftouter benignLifecycleKeys on _ResourceId, AppRoleName, AppRoleInstance | where not (coalesce(HasBenignLifecyclePair, false) and IsBenignLifecycle) | summarize FailureCount=sum(FailureCount)'

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: runtimeIdentityName
  location: location
  tags: tags
}

resource storage 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  tags: tags
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
    encryption: {
      keySource: 'Microsoft.Storage'
      requireInfrastructureEncryption: true
      services: {
        blob: { enabled: true }
        file: { enabled: true }
        queue: { enabled: true }
        table: { enabled: true }
      }
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-06-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2025-06-01' = {
  parent: storage
  name: 'default'
  properties: {}
}

resource briefsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = {
  parent: blobService
  name: 'briefs'
  properties: { publicAccess: 'None' }
}

resource ledgerContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = {
  parent: blobService
  name: 'ledger'
  properties: { publicAccess: 'None' }
}

resource deadLetterContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = {
  parent: blobService
  name: 'deadletter'
  properties: { publicAccess: 'None' }
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = {
  parent: blobService
  name: 'deployments'
  properties: { publicAccess: 'None' }
}

resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2025-06-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'expire-rate-limit-counters'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'ledger/rate/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: policyConfig.rateLimitRetentionDays } } }
          }
        }
        {
          name: 'expire-contact-locks'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'ledger/locks/contact/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: policyConfig.contactLockRetentionDays } } }
          }
        }
        {
          name: 'expire-ledger'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'ledger/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: policyConfig.ledgerRetentionDays } } }
          }
        }
        {
          name: 'expire-deadletters'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'deadletter/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: policyConfig.deadLetterRetentionDays } } }
          }
        }
        {
          name: 'expire-deployments'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'deployments/' ] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: policyConfig.deploymentRetentionDays } } }
          }
        }
      ]
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Enabled'
  }
}

resource emailService 'Microsoft.Communication/emailServices@2025-09-01' = {
  name: emailServiceName
  location: 'global'
  tags: tags
  properties: { dataLocation: 'United States' }
}

resource emailDomain 'Microsoft.Communication/emailServices/domains@2025-09-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource senderUsername 'Microsoft.Communication/emailServices/domains/senderUsernames@2025-09-01' = {
  parent: emailDomain
  name: 'DoNotReply'
  properties: {
    username: 'DoNotReply'
    displayName: serviceConfig.companyName
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2025-09-01' = {
  name: communicationServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'United States'
    linkedDomains: [ emailDomain.id ]
  }
}

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2025-02-01' = {
  name: logWorkspaceName
  location: location
  tags: tags
  properties: {
    retentionInDays: 90
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
    sku: { name: 'PerGB2018' }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    DisableIpMasking: false
    IngestionMode: 'LogAnalytics'
    WorkspaceResourceId: logWorkspace.id
  }
}

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: servicePlanName
  location: location
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  properties: { reserved: true }
  tags: tags
}

resource functionApp 'Microsoft.Web/sites@2024-11-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${runtimeIdentity.id}': {} }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    keyVaultReferenceIdentity: runtimeIdentity.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainer.name}'
          authentication: {
            type: 'UserAssignedIdentity'
            userAssignedIdentityResourceId: runtimeIdentity.id
          }
        }
      }
      runtime: { name: 'node', version: '24' }
      scaleAndConcurrency: { maximumInstanceCount: 20, instanceMemoryMB: 512 }
    }
    siteConfig: {
      alwaysOn: false
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      // SCM remains an authenticated control-plane deployment surface. It cannot
      // inherit the Front Door-only runtime rule or GitLab OIDC zip deployment is blocked.
      scmIpSecurityRestrictionsUseMain: false
      scmIpSecurityRestrictionsDefaultAction: 'Allow'
      ipSecurityRestrictionsDefaultAction: 'Deny'
      ipSecurityRestrictions: [
        {
          name: 'Allow-Azure-Front-Door'
          action: 'Allow'
          priority: 100
          ipAddress: 'AzureFrontDoor.Backend'
          tag: 'ServiceTag'
          headers: {
            'x-azure-fdid': [ frontDoorId ]
          }
        }
      ]
      cors: {
        // The Functions host owns the browser preflight response. The shared
        // Front Door rule set adds the security headers that the host omits
        // from its optimized preflight path.
        allowedOrigins: serviceConfig.allowedOrigins
        supportCredentials: false
      }
      appSettings: [
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'AzureFunctionsJobHost__logging__logLevel__default', value: 'Warning' }
        { name: 'AzureFunctionsJobHost__logging__logLevel__Function', value: 'Warning' }
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'AzureWebJobsStorage__credential', value: 'managedidentity' }
        { name: 'AzureWebJobsStorage__clientId', value: runtimeIdentity.properties.clientId }
        { name: 'AzureWebJobsStorage__blobServiceUri', value: 'https://${storage.name}.blob.${storageSuffix}' }
        { name: 'AzureWebJobsStorage__queueServiceUri', value: 'https://${storage.name}.queue.${storageSuffix}' }
        { name: 'AZURE_CLIENT_ID', value: runtimeIdentity.properties.clientId }
        { name: 'BRIEF_STORAGE_ACCOUNT_NAME', value: storage.name }
        { name: 'BRIEF_CONTAINER_NAME', value: briefsContainer.name }
        { name: 'LEDGER_CONTAINER_NAME', value: ledgerContainer.name }
        { name: 'DEADLETTER_CONTAINER_NAME', value: deadLetterContainer.name }
        { name: 'CRM_RETRY_QUEUE_NAME', value: 'crm-retry' }
        { name: 'COMPANY_NAME', value: serviceConfig.companyName }
        { name: 'COMPANY_DOMAIN', value: serviceConfig.companyDomain }
        { name: 'BRIEF_HOST', value: serviceConfig.briefHost }
        { name: 'PUBLIC_SITE_URL', value: serviceConfig.publicSiteUrl }
        { name: 'CONTACT_URL', value: serviceConfig.contactUrl }
        { name: 'CONTACT_EMAIL', value: serviceConfig.contactEmail }
        { name: 'REPLY_TO', value: serviceConfig.replyTo }
        { name: 'ALLOWED_ORIGINS', value: join(serviceConfig.allowedOrigins, ',') }
        { name: 'EXPECTED_FRONT_DOOR_ID', value: frontDoorId }
        { name: 'KEY_VAULT_URI', value: 'https://${keyVault.name}${keyVaultSuffix}' }
        { name: 'ACS_ENDPOINT', value: 'https://${communicationService.name}.communication.azure.com' }
        { name: 'ACS_SENDER_ADDRESS_SECRET_NAME', value: secretNames.acsSenderAddress }
        { name: 'TURNSTILE_SECRET_NAME', value: secretNames.turnstileSecret }
        { name: 'UNSUBSCRIBE_TOKEN_SECRET_NAME', value: secretNames.unsubscribeTokenKey }
        { name: 'DATAVERSE_ACCOUNT_ID_SECRET_NAME', value: secretNames.dataverseAccountId }
        { name: 'DATAVERSE_BUSINESS_UNIT_ID_SECRET_NAME', value: secretNames.dataverseBusinessUnitId }
        { name: 'DATAVERSE_OWNER_TEAM_ID_SECRET_NAME', value: secretNames.dataverseOwnerTeamId }
        { name: 'DATAVERSE_URL', value: serviceConfig.dataverseUrl }
        { name: 'DATAVERSE_ENTITY_SET', value: serviceConfig.dataverseEntitySet }
        { name: 'DATAVERSE_ENTITY_LOGICAL_NAME', value: serviceConfig.dataverseEntityLogicalName }
        { name: 'DATAVERSE_REQUEST_ID_COLUMN', value: serviceConfig.dataverseRequestIdColumn }
        { name: 'TURNSTILE_REQUIRED', value: policyConfig.turnstileRequired ? 'true' : 'false' }
        { name: 'SAS_HOURS', value: string(policyConfig.signedUrlHours) }
        { name: 'RATE_LIMIT_PER_HOUR', value: string(policyConfig.rateLimitPerHour) }
      ]
    }
  }
  dependsOn: [
    runtimeBlobRole
    runtimeQueueRole
    runtimeVaultRole
    runtimeEmailRole
  ]
}

resource runtimeBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, runtimeIdentity.id, blobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource runtimeQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, runtimeIdentity.id, queueDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', queueDataContributorRoleId)
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource runtimeVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, runtimeIdentity.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource runtimeEmailRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(communicationService.id, runtimeIdentity.id, communicationSenderRoleDefinitionId)
  scope: communicationService
  properties: {
    roleDefinitionId: communicationSenderRoleDefinitionId
    principalId: runtimeIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource deployBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deploymentPrincipalObjectId)) {
  name: guid(deploymentContainer.id, deploymentPrincipalObjectId, blobDataContributorRoleId)
  scope: deploymentContainer
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}

resource deployBriefRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deploymentPrincipalObjectId)) {
  name: guid(briefsContainer.id, deploymentPrincipalObjectId, blobDataContributorRoleId)
  scope: briefsContainer
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: deploymentPrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}

resource storageDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: storage
  properties: {
    workspaceId: logWorkspace.id
    // This resource exposes metrics only; keep one signal enabled because an
    // all-disabled diagnostic setting is rejected by Azure. Service-level
    // duplicate metrics are disabled below.
    metrics: [ { category: 'Transaction', enabled: true } ]
  }
}

resource blobDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: blobService
  properties: {
    workspaceId: logWorkspace.id
    logs: [
      { category: 'StorageRead', enabled: false }
      { category: 'StorageWrite', enabled: true }
      { category: 'StorageDelete', enabled: true }
    ]
    metrics: [ { category: 'Transaction', enabled: false } ]
  }
}

resource queueDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: queueService
  properties: {
    workspaceId: logWorkspace.id
    logs: [
      { category: 'StorageRead', enabled: false }
      { category: 'StorageWrite', enabled: true }
      { category: 'StorageDelete', enabled: true }
    ]
    metrics: [ { category: 'Transaction', enabled: false } ]
  }
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: keyVault
  properties: {
    workspaceId: logWorkspace.id
    logs: [ { category: 'AuditEvent', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: false } ]
  }
}

resource functionDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: functionApp
  properties: {
    workspaceId: logWorkspace.id
    // Host logging is Warning-or-higher. Keep function application logs while
    // eliminating duplicated metrics ingestion.
    logs: [ { category: 'FunctionAppLogs', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: false } ]
  }
}

resource functionFailureAlert 'Microsoft.Insights/scheduledQueryRules@2025-01-01-preview' = {
  name: 'HardMagic BriefLock failures'
  location: location
  tags: tags
  properties: {
    displayName: 'HardMagic BriefLock failures'
    enabled: true
    severity: 1
    evaluationFrequency: 'PT5M'
    windowSize: 'PT10M'
    scopes: [ logWorkspace.id ]
    criteria: {
      allOf: [
        {
          query: functionFailureQuery
          timeAggregation: 'Total'
          metricMeasureColumn: 'FailureCount'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: { numberOfEvaluationPeriods: 1, minFailingPeriodsToAlert: 1 }
        }
      ]
    }
    actions: { actionGroups: [ alertActionGroupResourceId ] }
  }
}

output functionAppName string = functionApp.name
output functionOriginHostname string = functionApp.properties.defaultHostName
output keyVaultName string = keyVault.name
output runtimeIdentityClientId string = runtimeIdentity.properties.clientId
output runtimeIdentityPrincipalId string = runtimeIdentity.properties.principalId
output storageAccountName string = storage.name
