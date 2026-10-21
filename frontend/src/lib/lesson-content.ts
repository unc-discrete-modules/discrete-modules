export type LessonSections = {
  objectives: string
  body: string
}

export function splitLessonSections(body: string): LessonSections {
  const heading = /^## Learning Objectives\s*$/m.exec(body)
  if (!heading || heading.index === undefined) {
    return { objectives: '', body }
  }

  const objectivesStart = heading.index + heading[0].length
  const remainingBody = body.slice(objectivesStart)
  const nextHeading = /\n##\s+/.exec(remainingBody)
  const objectivesEnd = nextHeading?.index ?? remainingBody.length
  const objectives = remainingBody.slice(0, objectivesEnd).trim()
  const beforeObjectives = body.slice(0, heading.index).trim()
  const afterObjectives = remainingBody.slice(objectivesEnd).trim()

  return {
    objectives,
    body: [beforeObjectives, afterObjectives].filter(Boolean).join('\n\n'),
  }
}