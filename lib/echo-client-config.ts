const appId = process.env.NEXT_PUBLIC_ECHO_APP_ID ?? '';
const environment = process.env.NEXT_PUBLIC_ECHO_ENV ?? 'sandbox';

export const echoClientConfig = {
  appId,
  environment,
  // TODO: add billing policy IDs, markup configuration, etc.
};
