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
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var queueDataContributorRoleId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
// Keep the lifecycle-recycle exception exact: suppress the known pair only
// when both messages are present in the same alert window. Delivery failures
// and other worker exits remain alertable.
var functionFailureQuery = 'let benignSigtermMessages = dynamic(["node exited with code 143", "node exited with code 143 (SIGTERM)"]); let benignLifecycleMessages = dynamic(["node exited with code 143", "node exited with code 143 (SIGTERM)", "Language Worker Process exited"]); let recentFailures = union isfuzzy=true AppExceptions, (AppTraces | where SeverityLevel >= 3) | extend AlertMessage = tostring(coalesce(column_ifexists("Message", ""), column_ifexists("ExceptionMessage", ""), column_ifexists("OuterMessage", ""), column_ifexists("InnermostMessage", ""), column_ifexists("ProblemId", ""))) | where TimeGenerated > ago(10m); let benignSigtermPresent = toscalar(recentFailures | where AlertMessage in (benignSigtermMessages) | summarize Present = count() > 0 | project Present); let benignWorkerExitPresent = toscalar(recentFailures | where AlertMessage == "Language Worker Process exited" | summarize Present = count() > 0 | project Present); recentFailures | where not (benignSigtermPresent and benignWorkerExitPresent and AlertMessage in (benignLifecycleMessages)) | summarize FailureCount=count()'

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
      runtime: { name: 'node', version: '22' }
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
        // CORS is emitted by the function so every preflight also receives
        // the runtime security headers. An empty host-level allow-list keeps
        // the Functions platform from short-circuiting OPTIONS responses.
        allowedOrigins: []
        supportCredentials: false
      }
      appSettings: [
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
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
    metrics: [ { category: 'Transaction', enabled: true } ]
  }
}

resource blobDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: blobService
  properties: {
    workspaceId: logWorkspace.id
    logs: [
      { category: 'StorageRead', enabled: true }
      { category: 'StorageWrite', enabled: true }
      { category: 'StorageDelete', enabled: true }
    ]
    metrics: [ { category: 'Transaction', enabled: true } ]
  }
}

resource queueDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: queueService
  properties: {
    workspaceId: logWorkspace.id
    logs: [
      { category: 'StorageRead', enabled: true }
      { category: 'StorageWrite', enabled: true }
      { category: 'StorageDelete', enabled: true }
    ]
    metrics: [ { category: 'Transaction', enabled: true } ]
  }
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: keyVault
  properties: {
    workspaceId: logWorkspace.id
    logs: [ { category: 'AuditEvent', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
  }
}

resource functionDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-hardmagic-brief-logs'
  scope: functionApp
  properties: {
    workspaceId: logWorkspace.id
    logs: [ { categoryGroup: 'allLogs', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
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
