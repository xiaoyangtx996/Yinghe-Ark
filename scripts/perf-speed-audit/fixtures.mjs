/**
 * Browser-side speed audit payload builder (paste/run via Playwright evaluate).
 * Timing:
 * - page: trigger → destination URL stable + key selector visible
 * - api: performance.now around fetch (credentials include)
 */
export const PROJECT_ID = '06c4e547-e580-413c-b61c-2dd8f10cdc96'
export const EPISODE_ID = 'b7a75069-1fb8-4117-91c3-b6c80daf2ff2'
export const BASE = 'http://localhost:3000/zh'

/** Safe read-only GETs that can be called without mutating production data. */
export const SAFE_GETS = [
  { id: 'boot-id', method: 'GET', url: '/api/system/boot-id' },
  { id: 'user-preference', method: 'GET', url: '/api/user-preference' },
  { id: 'user-balance', method: 'GET', url: '/api/user/balance' },
  { id: 'user-models', method: 'GET', url: '/api/user/models' },
  { id: 'user-costs', method: 'GET', url: '/api/user/costs' },
  { id: 'user-transactions', method: 'GET', url: '/api/user/transactions?page=1&pageSize=10' },
  { id: 'projects-list', method: 'GET', url: '/api/projects?page=1&pageSize=20' },
  { id: 'project-data', method: 'GET', url: `/api/projects/${PROJECT_ID}/data` },
  { id: 'episodes-index', method: 'GET', url: `/api/novel-promotion/${PROJECT_ID}/episodes?view=index` },
  { id: 'episode-script', method: 'GET', url: `/api/novel-promotion/${PROJECT_ID}/episodes/${EPISODE_ID}?view=script` },
  { id: 'episode-full', method: 'GET', url: `/api/novel-promotion/${PROJECT_ID}/episodes/${EPISODE_ID}?view=full` },
  { id: 'assets-project', method: 'GET', url: `/api/assets?scope=project&projectId=${PROJECT_ID}` },
  { id: 'assets-global-character', method: 'GET', url: '/api/assets?scope=global&kind=character' },
  { id: 'assets-global-location', method: 'GET', url: '/api/assets?scope=global&kind=location' },
  { id: 'assets-global-prop', method: 'GET', url: '/api/assets?scope=global&kind=prop' },
  { id: 'assets-global-voice', method: 'GET', url: '/api/assets?scope=global&kind=voice' },
  { id: 'asset-hub-folders', method: 'GET', url: '/api/asset-hub/folders' },
  { id: 'task-target-states', method: 'GET', url: '/api/task-target-states' },
  { id: 'runs-story-script', method: 'GET', url: `/api/runs?projectId=${PROJECT_ID}&workflowType=story_to_script_run&targetType=NovelPromotionEpisode&targetId=${EPISODE_ID}` },
  { id: 'runs-script-storyboard', method: 'GET', url: `/api/runs?projectId=${PROJECT_ID}&workflowType=script_to_storyboard_run&targetType=NovelPromotionEpisode&targetId=${EPISODE_ID}` },
  { id: 'voice-lines', method: 'GET', url: `/api/novel-promotion/${PROJECT_ID}/voice-lines?episodeId=${EPISODE_ID}` },
  { id: 'speaker-voice', method: 'GET', url: `/api/novel-promotion/${PROJECT_ID}/speaker-voice?episodeId=${EPISODE_ID}` },
  { id: 'admin-logs', method: 'GET', url: '/api/admin/logs' },
  { id: 'admin-log-events', method: 'GET', url: '/api/admin/logs/events?kind=audit&limit=20' },
]
