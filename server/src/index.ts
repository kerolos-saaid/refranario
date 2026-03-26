import type { ExportedHandler, MessageBatch, ScheduledController } from '@cloudflare/workers-types'

import { createApp } from './app/create-app'
import { createProverbImageJobService } from './app/create-services'
import type { AppBindings } from './shared/types/app-env'
import type { ProverbImageJobMessage } from './modules/proverb-images/proverb-image.types'

export function createWorkerHandler() {
  const app = createApp()
  type WorkerFetch = NonNullable<ExportedHandler<AppBindings, ProverbImageJobMessage>['fetch']>

  const worker: ExportedHandler<AppBindings, ProverbImageJobMessage> = {
    fetch: ((request: Parameters<WorkerFetch>[0], env: Parameters<WorkerFetch>[1], ctx: Parameters<WorkerFetch>[2]) =>
      app.fetch(request as unknown as Request, env, ctx)) as unknown as WorkerFetch,
    queue: async (batch: MessageBatch<ProverbImageJobMessage>, env: AppBindings) => {
      await createProverbImageJobService(env).processBatch(batch)
    },
    scheduled: async (_controller: ScheduledController, env: AppBindings) => {
      await createProverbImageJobService(env).backfill()
    }
  }

  return worker
}

export default createWorkerHandler()
