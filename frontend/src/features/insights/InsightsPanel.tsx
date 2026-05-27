import { motion } from 'framer-motion'
import { RefreshCcw, Users } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import type { MatchResponse, SessionOut, TeacherOut } from '../../lib/types'

type Props = {
  teacher: TeacherOut
  sessions?: SessionOut[]
  matches?: MatchResponse | null
  busy?: boolean
  onRefresh: () => void
}

export function InsightsPanel({
  teacher,
  sessions,
  matches,
  busy,
  onRefresh,
}: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>History & peers</CardTitle>
          <div className="mt-1 text-xs text-white/45">Quick context at a glance</div>
        </div>
        <Button
          variant="ghost"
          className="h-9 w-9 rounded-xl p-0"
          onClick={onRefresh}
          disabled={busy}
          aria-label="Refresh"
        >
          {busy ? <Spinner /> : <RefreshCcw className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardBody className="space-y-4">
        <section>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-white/70">Recent sessions</div>
            <Badge tone="neutral">{sessions?.length ?? 0}</Badge>
          </div>
          <div className="mt-2 space-y-2">
            {(sessions ?? []).slice(0, 6).map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: idx * 0.02 }}
                className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div className="line-clamp-2 text-xs text-white/70">{s.message}</div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge tone="neutral">{s.theme ?? 'other'}</Badge>
                  <div className="text-[11px] text-white/35">
                    {new Date(s.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
            {sessions && sessions.length === 0 ? (
              <div className="rounded-xl bg-white/5 p-3 text-xs text-white/45 ring-1 ring-white/10">
                No sessions yet — send your first reflection.
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Users className="h-4 w-4" /> Peer matches
            </div>
            <Badge tone="neutral">{matches?.matches?.length ?? 0}</Badge>
          </div>

          <div className="mt-2 space-y-2">
            {(matches?.matches ?? []).map((m, idx) => (
              <motion.div
                key={`${m.teacher_id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: idx * 0.02 }}
                className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/90">
                      {m.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-white/45">
                      {m.grades_taught || '—'} • {m.subjects_taught || '—'}
                    </div>
                  </div>
                  <Badge tone="good">
                    {Math.round(m.similarity_score * 100)}%
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-white/60">{m.reason}</div>
              </motion.div>
            ))}

            {matches && matches.matches.length === 0 ? (
              <div className="rounded-xl bg-white/5 p-3 text-xs text-white/45 ring-1 ring-white/10">
                No peer matches yet — add more teachers or reflect more.
              </div>
            ) : null}

            {!matches ? (
              <div className="rounded-xl bg-white/5 p-3 text-xs text-white/45 ring-1 ring-white/10">
                Tap refresh to find peers for {teacher.name}.
              </div>
            ) : null}
          </div>
        </section>
      </CardBody>
    </Card>
  )
}
