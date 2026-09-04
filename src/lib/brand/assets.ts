/**
 * Yinghe Ark (影核) brand assets — sourced from Yinghe-Ark-design-assets.
 * PNG rasters for logo chrome and rail navigation; Lucide AppIcon remains for in-app ops.
 */

export const BRAND_ASSET_VERSION = '5'

export const brandLogo = {
  horizontal: '/brand/logo-horizontal.png',
  vertical: '/brand/logo-vertical.png',
  mark: '/brand/logo-mark.png',
  iconApp: '/brand/logo-icon-app.png',
  onLight: '/brand/logo-on-light.png',
  onDark: '/brand/logo-on-dark.png',
  appIcon512: '/brand/app-icon-512.png',
  favicon: '/brand/favicon.png',
} as const

/** Theatre rail + primary shell navigation */
export const brandNavIcon = {
  home: '/brand/icons/nav-home.png',
  project: '/brand/icons/nav-project.png',
  workspace: '/brand/icons/nav-workspace.png',
  assets: '/brand/icons/nav-assets.png',
  logs: '/brand/icons/nav-logs.png',
  settings: '/brand/icons/nav-settings.png',
  profile: '/brand/icons/nav-profile.png',
} as const

/** Common ops — new / search etc. (asset hub, toolbars) */
export const brandOpIcon = {
  new: '/brand/icons/op-new.png',
  search: '/brand/icons/op-search.png',
} as const

/** Pipeline stages — landing / workbench chrome */
export const brandPipeIcon = {
  story: '/brand/icons/pipe-story.png',
  script: '/brand/icons/pipe-script.png',
  storyboard: '/brand/icons/pipe-storyboard.png',
  video: '/brand/icons/pipe-video.png',
  dubbing: '/brand/icons/pipe-dubbing.png',
} as const

/** Asset-type marks for landing stage preview tiles */
export const brandAssetTypeIcon = {
  character: '/brand/icons/asset-character.png',
  scene: '/brand/icons/asset-scene.png',
  prop: '/brand/icons/asset-prop.png',
  voice: '/brand/icons/asset-voice.png',
} as const

export type BrandNavIconName = keyof typeof brandNavIcon
export type BrandOpIconName = keyof typeof brandOpIcon
export type BrandPipeIconName = keyof typeof brandPipeIcon
export type BrandAssetTypeIconName = keyof typeof brandAssetTypeIcon

export function brandAssetUrl(path: string): string {
  return `${path}?v=${BRAND_ASSET_VERSION}`
}
