targetScope = 'subscription'

@description('HardMagic BriefLock resource group. Keep this boundary dedicated to gated brief delivery.')
param resourceGroupName string = 'rg-hardmagic-briefs'

@description('Azure region for regional resources.')
param location string = 'eastus'

@description('Deployment environment label.')
@allowed([
  'staging'
  'production'
])
param environmentName string = 'production'

@description('Azure Front Door profile GUID sent in the x-azure-fdid header. Required to prevent direct Function-origin bypass.')
@minLength(36)
@maxLength(36)
param frontDoorId string

@description('Object ID of the GitLab OIDC deployment service principal. It receives data-plane access only to the deployments and briefs containers; control-plane Contributor is bootstrapped separately.')
param deploymentPrincipalObjectId string

@description('Existing Azure Monitor action-group resource ID for production alerts.')
param alertActionGroupResourceId string

@description('Non-secret, typed HardMagic service configuration.')
param serviceConfig object = {
  companyName: 'HardMagic Corporation'
  companyDomain: 'hardmagic.com'
  briefHost: 'briefs.hardmagic.com'
  publicSiteUrl: 'https://hardmagic.com'
  contactUrl: 'https://hardmagic.com/contact/'
  contactEmail: 'hello@hardmagic.com'
  replyTo: 'hello@hardmagic.com'
  allowedOrigins: [
    'https://hardmagic.com'
    'https://www.hardmagic.com'
    'https://hardmagic.pages.developerdojo.org'
  ]
  dataverseUrl: 'https://dream.crm.dynamics.com'
  dataverseEntitySet: 'hm_briefengagements'
  dataverseEntityLogicalName: 'hm_briefengagement'
  dataverseRequestIdColumn: 'hm_requestid'
}

@description('Secret names only. Values are populated out-of-band in the dedicated vault.')
param secretNames object = {
  acsSenderAddress: 'acs-sender-address'
  turnstileSecret: 'turnstile-secret'
  unsubscribeTokenKey: 'unsubscribe-token-key'
  dataverseAccountId: 'dataverse-account-id'
  dataverseBusinessUnitId: 'dataverse-business-unit-id'
  dataverseOwnerTeamId: 'dataverse-owner-team-id'
}

@description('Retention and delivery controls.')
param policyConfig object = {
  ledgerRetentionDays: 395
  rateLimitRetentionDays: 2
  contactLockRetentionDays: 30
  deadLetterRetentionDays: 90
  deploymentRetentionDays: 30
  signedUrlHours: 48
  rateLimitPerHour: 5
  turnstileRequired: true
}

var tags = {
  company: 'hardmagic'
  environment: environmentName
  managedBy: 'bicep-gitlab'
  service: 'brief-lock'
  dataClassification: 'confidential-lead-metadata'
  sourceOfTruth: 'gitlab-hardmagic'
}

resource briefResourceGroup 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

resource communicationSenderRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(subscription().id, 'HardMagic ACS Email Runtime')
  properties: {
    roleName: 'HardMagic ACS Email Runtime'
    description: 'Runtime-only ACS access without key listing, key rotation, delete, domain administration, or resource-group privileges.'
    type: 'CustomRole'
    assignableScopes: [ briefResourceGroup.id ]
    permissions: [
      {
        actions: [
          'Microsoft.Communication/CommunicationServices/read'
          'Microsoft.Communication/CommunicationServices/write'
        ]
        notActions: []
        dataActions: []
        notDataActions: []
      }
    ]
  }
}

module briefLock 'modules/brief-lock.bicep' = {
  name: 'hardmagic-brief-lock-${environmentName}'
  scope: briefResourceGroup
  params: {
    location: location
    frontDoorId: frontDoorId
    deploymentPrincipalObjectId: deploymentPrincipalObjectId
    alertActionGroupResourceId: alertActionGroupResourceId
    communicationSenderRoleDefinitionId: communicationSenderRole.id
    serviceConfig: serviceConfig
    secretNames: secretNames
    policyConfig: policyConfig
    tags: tags
  }
}

output resourceGroupName string = briefResourceGroup.name
output functionAppName string = briefLock.outputs.functionAppName
output functionOriginHostname string = briefLock.outputs.functionOriginHostname
output keyVaultName string = briefLock.outputs.keyVaultName
output runtimeIdentityClientId string = briefLock.outputs.runtimeIdentityClientId
output runtimeIdentityPrincipalId string = briefLock.outputs.runtimeIdentityPrincipalId
output storageAccountName string = briefLock.outputs.storageAccountName
