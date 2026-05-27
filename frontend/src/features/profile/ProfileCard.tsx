import { motion } from 'framer-motion'
import { LogOut, ShieldCheck } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import type { TeacherOut } from '../../lib/types'

type Props = {
  teacher: TeacherOut
  health?: 'ok' | 'down' | 'unknown'
  onReset: () => void
}

export function ProfileCard({ teacher, health = 'unknown', onReset }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Profile</CardTitle>
            <div className="mt-1 truncate text-xs text-white/45">
              ID #{teacher.id}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={health === 'ok' ? 'good' : health === 'down' ? 'bad' : 'neutral'}>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                API {health === 'ok' ? 'online' : health === 'down' ? 'offline' : '…'}
              </span>
            </Badge>
            <Button
              variant="ghost"
              className="h-9 rounded-xl"
              onClick={onReset}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Switch
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-2 text-sm text-white/85">
            <div className="flex items-center justify-between gap-4">
              <div className="text-white/50">Name</div>
              <div className="truncate font-semibold text-white/90">{teacher.name}</div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-white/50">Grades</div>
              <div className="truncate">{teacher.grades_taught || '—'}</div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-white/50">Subjects</div>
              <div className="truncate">{teacher.subjects_taught || '—'}</div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-white/50">Experience</div>
              <div className="truncate">
                {teacher.years_of_experience == null ? '—' : `${teacher.years_of_experience} yrs`}
              </div>
            </div>

            <div className="pt-2 text-xs text-white/45">
              Your profile ID is stored in localStorage.
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}
