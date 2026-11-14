// Redirect www.beligri.org to beligri.org, keeping the path and query.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.beligri.org') {
    url.hostname = 'beligri.org';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
