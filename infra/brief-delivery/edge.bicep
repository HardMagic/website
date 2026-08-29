targetScope = 'resourceGroup'

@description('Existing shared Front Door profile. This file owns only HardMagic-named children.')
param profileName string = 'taodoor-standard'
param endpointName string = 'taodoor'
param functionOriginHostname string
param wafPolicyId string

resource profile 'Microsoft.Cdn/profiles@2024-09-01' existing = { name: profileName }
resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' existing = { parent: profile, name: endpointName }
resource globalEnterpriseDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' existing = { parent: profile, name: 'briefs-globalenterprise-com' }
resource taoLearningDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' existing = { parent: profile, name: 'door-taolearning' }
resource careersApiDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' existing = { parent: profile, name: 'careers-api-trustora-net' }
resource pTaoLearningDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' existing = { parent: profile, name: 'p-taolearning-org' }
resource stayMtCottagesDomain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' existing = { parent: profile, name: 'stay-mtcottages-com' }

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  parent: profile
  name: 'hardmagic-briefs-origins'
  properties: {
    healthProbeSettings: { probePath: '/api/health', probeRequestType: 'GET', probeProtocol: 'Https', probeIntervalInSeconds: 30 }
    loadBalancingSettings: { sampleSize: 4, successfulSamplesRequired: 2, additionalLatencyInMilliseconds: 0 }
    sessionAffinityState: 'Enabled'
    trafficRestorationTimeToHealedOrNewEndpointsInMinutes: 10
  }
}

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = {
  parent: originGroup
  name: 'hardmagic-brief-function'
  properties: {
    hostName: functionOriginHostname
    // The Function only owns its azurewebsites.net hostname. Do not send a
    // custom host header until that hostname is explicitly bound to the App
    // Service; Front Door would otherwise receive a host mismatch/404.
    originHostHeader: functionOriginHostname
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource domain 'Microsoft.Cdn/profiles/customDomains@2024-09-01' = {
  parent: profile
  name: 'briefs-hardmagic-com'
  properties: {
    hostName: 'briefs.hardmagic.com'
    tlsSettings: { certificateType: 'ManagedCertificate', minimumTlsVersion: 'TLS12' }
  }
}

resource securityHeadersRuleSet 'Microsoft.Cdn/profiles/ruleSets@2024-09-01' = {
  parent: profile
  name: 'HardMagicSecurityHeaders'
}

resource securityHeadersRule 'Microsoft.Cdn/profiles/ruleSets/rules@2024-09-01' = {
  parent: securityHeadersRuleSet
  name: 'AddSecurityHeaders'
  properties: {
    order: 1
    matchProcessingBehavior: 'Continue'
    conditions: []
    actions: [
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Content-Security-Policy'
          value: base64ToString('ZGVmYXVsdC1zcmMgJ25vbmUnOyBiYXNlLXVyaSAnbm9uZSc7IG9iamVjdC1zcmMgJ25vbmUnOyBmcmFtZS1hbmNlc3RvcnMgJ25vbmUnOyBmb3JtLWFjdGlvbiAnc2VsZic7IHNjcmlwdC1zcmMgJ25vbmUnOyBzdHlsZS1zcmMgJ3Vuc2FmZS1pbmxpbmUnOyBpbWctc3JjICdub25lJw==')
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Permissions-Policy'
          value: 'accelerometer=(), camera=(), clipboard-read=(), clipboard-write=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=(), xr-spatial-tracking=(), autoplay=(self "https://www.youtube-nocookie.com"), fullscreen=(self "https://www.youtube-nocookie.com"), picture-in-picture=(self "https://www.youtube-nocookie.com")'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'X-Frame-Options'
          value: 'DENY'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Cross-Origin-Opener-Policy'
          value: 'same-origin'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Cross-Origin-Resource-Policy'
          value: 'same-origin'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'X-Content-Type-Options'
          value: 'nosniff'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'Referrer-Policy'
          value: 'no-referrer'
        }
      }
      {
        name: 'ModifyResponseHeader'
        parameters: {
          typeName: 'DeliveryRuleHeaderActionParameters'
          headerAction: 'Overwrite'
          headerName: 'X-Permitted-Cross-Domain-Policies'
          value: 'none'
        }
      }
    ]
  }
}

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = {
  parent: endpoint
  name: 'hardmagic-briefs-route'
  properties: {
    originGroup: { id: originGroup.id }
    customDomains: [ { id: domain.id } ]
    supportedProtocols: [ 'Https' ]
    patternsToMatch: [ '/api/brief-request', '/api/contact-request', '/api/unsubscribe', '/api/health' ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Disabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    ruleSets: [ { id: securityHeadersRuleSet.id } ]
  }
  dependsOn: [ origin, securityHeadersRule ]
}

// Azure Front Door permits one WAF policy attachment per profile. Preserve every
// existing association while adding the HardMagic custom domain to that binding.
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-09-01' = {
  parent: profile
  name: 'tliwafstandard-binding'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: wafPolicyId }
      associations: [
        {
          domains: [
            { id: endpoint.id }
            { id: globalEnterpriseDomain.id }
            { id: careersApiDomain.id }
            { id: taoLearningDomain.id }
            { id: pTaoLearningDomain.id }
            { id: stayMtCottagesDomain.id }
            { id: domain.id }
          ]
          patternsToMatch: [ '/*' ]
        }
      ]
    }
  }
}

output customDomainId string = domain.id
output originGroupId string = originGroup.id
output routeId string = route.id
output securityPolicyId string = securityPolicy.id
