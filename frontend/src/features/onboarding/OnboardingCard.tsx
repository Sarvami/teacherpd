import { motion } from 'framer-motion'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { HelpText, Label, Select, TextArea, TextInput } from '../../components/Inputs'
import { Spinner } from '../../components/Spinner'
import type { TeacherCreate, TeacherOut } from '../../lib/types'

type Props = {
  busy?: boolean
  onCreate: (payload: TeacherCreate) => Promise<TeacherOut>
}

export function OnboardingCard({ busy, onCreate }: Props) {
  const [name, setName] = useState('')
  const [grades, setGrades] = useState('')
  const [subjects, setSubjects] = useState('')
  const [years, setYears] = useState<string>('')
  const [challenge, setChallenge] = useState('')
  const [coachingLanguage, setCoachingLanguage] = useState('English')

  const yearsValue = useMemo(() => {
    const n = years.trim() === '' ? null : Number(years)
    return Number.isFinite(n) ? n : null
  }, [years])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: TeacherCreate = {
      name,
      grades_taught: grades || null,
      subjects_taught: subjects || null,
      years_of_experience: yearsValue,
      biggest_challenge: challenge || null,
      coaching_language: coachingLanguage || 'English',
    }

    await onCreate(payload)
  }

  const canSubmit = name.trim().length > 0 && !busy

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Start your coaching space</CardTitle>
            <div className="mt-1 text-xs text-white/45">
              Create a teacher profile to get tailored support and peer matches.
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <TextInput
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asha Singh"
                autoComplete="name"
              />
              <HelpText>Required.</HelpText>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="grades">Grades taught</Label>
                <TextInput
                  id="grades"
                  value={grades}
                  onChange={(e) => setGrades(e.target.value)}
                  placeholder="e.g. Grade 5, Grade 6"
                />
              </div>
              <div>
                <Label htmlFor="subjects">Subjects taught</Label>
                <TextInput
                  id="subjects"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="e.g. Mathematics, Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="years">Years of experience</Label>
                <TextInput
                  id="years"
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
              <div>
                <Label htmlFor="coachLang">Coaching language</Label>
                <Select
                  id="coachLang"
                  value={coachingLanguage}
                  onChange={(e) => setCoachingLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Bengali">Bengali</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="challenge">Biggest challenge (optional)</Label>
              <TextArea
                id="challenge"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="Describe what’s happening and what you’ve already tried."
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <UserPlus className="h-4 w-4" />
                Your profile is stored locally in this browser.
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                leftIcon={busy ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
              >
                Create profile
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </motion.div>
  )
}
