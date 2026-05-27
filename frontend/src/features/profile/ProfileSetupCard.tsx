import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { HelpText, Label, Select, TextArea, TextInput } from '../../components/Inputs'
import { Spinner } from '../../components/Spinner'
import type { ProfileOut, ProfileUpdate } from '../../lib/teachupTypes'

type Props = {
  busy?: boolean
  initialName: string
  initialProfile?: Partial<ProfileOut> | null
  onSave: (payload: ProfileUpdate) => Promise<ProfileOut>
  onCancel?: () => void
  mode?: 'onboarding' | 'edit'
}

export function ProfileSetupCard({
  busy,
  initialName,
  initialProfile,
  onSave,
  onCancel,
  mode = 'onboarding',
}: Props) {
  const [name, setName] = useState(initialProfile?.name ?? initialName)
  const [grades, setGrades] = useState(initialProfile?.grades_taught ?? '')
  const [subjects, setSubjects] = useState(initialProfile?.subjects_taught ?? '')
  const [years, setYears] = useState(
    initialProfile?.years_of_experience == null ? '' : String(initialProfile.years_of_experience),
  )
  const [school, setSchool] = useState(initialProfile?.school ?? '')
  const [state, setState] = useState(initialProfile?.state ?? '')
  const [district, setDistrict] = useState(initialProfile?.district ?? '')
  const [instructionLanguage, setInstructionLanguage] = useState(initialProfile?.instruction_language ?? '')
  const [challenge, setChallenge] = useState(initialProfile?.biggest_challenge ?? '')
  const [coachingLanguage, setCoachingLanguage] = useState(initialProfile?.coaching_language ?? 'English')

  const yearsValue = useMemo(() => {
    const n = years.trim() === '' ? null : Number(years)
    return Number.isFinite(n) ? (n as number) : null
  }, [years])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: ProfileUpdate = {
      name: name.trim() || undefined,
      grades_taught: grades || null,
      subjects_taught: subjects || null,
      years_of_experience: yearsValue,
      school: school || null,
      state: state || null,
      district: district || null,
      instruction_language: instructionLanguage || null,
      biggest_challenge: challenge || null,
      coaching_language: coachingLanguage || 'English',
    }

    await onSave(payload)
  }

  const canSubmit = name.trim().length > 0 && !busy

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
              {mode === 'edit' ? 'Profile' : 'Setup'}
            </div>
            <CardTitle className="mt-1 text-base">
              {mode === 'edit' ? 'Edit your teaching profile' : 'Set up your teaching profile'}
            </CardTitle>
            <div className="mt-1 text-xs text-white/45">
              {mode === 'edit'
                ? 'Update your details to keep coaching suggestions accurate.'
                : 'This helps TeachUp tailor suggestions to your context.'}
            </div>
          </div>

          {onCancel ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          ) : null}
        </CardHeader>

        <CardBody className="pt-0">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/90">Basics</div>
                <div className="text-xs text-white/40">Step 1 of 2</div>
              </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <TextInput id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              <HelpText>Required.</HelpText>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="years">Years of experience</Label>
                <TextInput id="years" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="coachLang">Coaching language</Label>
                <Select id="coachLang" value={coachingLanguage} onChange={(e) => setCoachingLanguage(e.target.value)}>
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

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/90">Context (optional)</div>
                <div className="text-xs text-white/40">Step 2 of 2</div>
              </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="school">School (optional)</Label>
                <TextInput id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="instructionLanguage">Instruction language (optional)</Label>
                <TextInput
                  id="instructionLanguage"
                  value={instructionLanguage}
                  onChange={(e) => setInstructionLanguage(e.target.value)}
                  placeholder="e.g. English"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="state">State (optional)</Label>
                <TextInput id="state" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="district">District (optional)</Label>
                <TextInput id="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="challenge">Biggest challenge (optional)</Label>
              <TextArea
                id="challenge"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="Describe what’s happening and what you’ve already tried."
              />
            </div>

            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <ClipboardList className="h-4 w-4" />
                You can update this anytime.
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                leftIcon={busy ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
              >
                {mode === 'edit' ? 'Save changes' : 'Save profile'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </motion.div>
  )
}
