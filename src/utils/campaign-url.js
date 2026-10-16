/**
 * @param {string} href
 * @param {string} placement
 * @param {import('../i18n').Lang} lang
 */
export function withHomepageUtm(href, placement, lang) {
 const url = new URL(href);
 url.searchParams.set('utm_source', 'twms');
 url.searchParams.set('utm_medium', 'referral');
 url.searchParams.set('utm_campaign', 'homepage');
 url.searchParams.set('utm_content', `${placement}_${lang}`);
 return url.toString();
}
