targetScope = 'resourceGroup'

@description('Existing shared Front Door profile. This file owns only HardMagic-named children; the shared WAF binding remains Terraform-owned.')
param profileName string = 'taodoor-standard'
param endpointName string = 'taodoor'
param functionOriginHostname string

resource profile 'Microsoft.Cdn/profiles@2024-09-01' existing = { name: profileName }
resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' existing = { parent: profile, name: endpointName }

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  parent: profile
  name: 'hardmagic-briefs-origins'
  properties: {
    // Front Door probes from many edge locations. The maximum supported
    // interval preserves origin-health detection while avoiding tens of
    // thousands of low-value Function invocations per day.
    healthProbeSettings: { probePath: '/api/health', probeRequestType: 'GET', probeProtocol: 'Https', probeIntervalInSeconds: 255 }
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

// The shared profile-level WAF binding is owned by the authoritative Terraform
// stack. Keep it out of this incremental deployment so the existing association
// remains live and cannot be replaced by a partial domain list.

output customDomainId string = domain.id
output originGroupId string = originGroup.id
output routeId string = route.id
