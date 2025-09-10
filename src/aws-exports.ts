// AWS Amplify configuration - defines authentication and AWS service settings
// Configures Cognito user pools, identity pools, and authentication flow
const awsconfig = {
  aws_project_region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  aws_cognito_region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  aws_user_pools_id: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  aws_cognito_identity_pool_id: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID,
  aws_cognito_username_attributes: ['email'],
  aws_cognito_social_providers: [],
  aws_cognito_signup_attributes: ['email'],
  aws_cognito_mfa_configuration: 'OFF',
  aws_cognito_mfa_types: ['SMS'],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_verification_mechanisms: ['email']
};

export default awsconfig;