import { inlineData, section } from './content'

// Browser-tab titles for in-app navigation. The first load gets all meta tags from index.php,
// which also passes the page titles (saved or default) so later navigations show the same ones.

export function pageTitle(pageKey: string) {
  return inlineData.titles?.[pageKey] || section('global.seo').siteName
}

export function withSiteName(title: string) {
  const site = section('global.seo').siteName
  return title.includes(site) ? title : `${title} — ${site}`
}
