import { describe, expect, it, vi } from 'vitest'
import {
  applyGenreConstraint,
  runStoryToScriptOrchestrator,
} from '@/lib/novel-promotion/story-to-script/orchestrator'
import { getGenrePackPrompt } from '@/lib/genre-packs'

describe('applyGenreConstraint', () => {
  it('prepends trimmed constraint', () => {
    expect(applyGenreConstraint('BODY', '  题材约束  ')).toBe('题材约束\n\nBODY')
  })

  it('is a no-op when constraint is empty', () => {
    expect(applyGenreConstraint('BODY', '')).toBe('BODY')
    expect(applyGenreConstraint('BODY', null)).toBe('BODY')
    expect(applyGenreConstraint('BODY', undefined)).toBe('BODY')
  })
})

describe('story-to-script orchestrator genre injection', () => {
  it('injects genre into every LLM step prompt when genreConstraint is set', async () => {
    const genreConstraint = getGenrePackPrompt('romance_mogul', 'zh')
    expect(genreConstraint).toContain('豪门婚恋')

    const promptsByAction = new Map<string, string>()
    const runStep = vi.fn(async (_meta, prompt: string, action: string) => {
      promptsByAction.set(action, prompt)
      if (action === 'analyze_characters') {
        return { text: JSON.stringify({ characters: [{ name: '甲', introduction: '人物介绍' }] }), reasoning: '' }
      }
      if (action === 'analyze_locations') {
        return { text: JSON.stringify({ locations: [{ name: '地点A' }] }), reasoning: '' }
      }
      if (action === 'analyze_props') {
        return { text: JSON.stringify({ props: [] }), reasoning: '' }
      }
      if (action === 'split_clips') {
        return {
          text: JSON.stringify([
            {
              start: '甲在门口',
              end: '乙回答',
              summary: '片段摘要',
              location: '地点A',
              characters: ['甲'],
            },
          ]),
          reasoning: '',
        }
      }
      return { text: JSON.stringify({ scenes: [{ id: 1 }] }), reasoning: '' }
    })

    await runStoryToScriptOrchestrator({
      content: '甲在门口。乙回答。',
      baseCharacters: [],
      baseLocations: [],
      baseCharacterIntroductions: [],
      genreConstraint,
      promptTemplates: {
        characterPromptTemplate: '{input} {characters_lib_name} {characters_lib_info}',
        locationPromptTemplate: '{input} {locations_lib_name}',
        propPromptTemplate: '{input} {props_lib_name}',
        clipPromptTemplate: '{input} {locations_lib_name} {characters_lib_name} {characters_introduction}',
        screenplayPromptTemplate: '{clip_content} {locations_lib_name} {characters_lib_name} {characters_introduction} {clip_id}',
      },
      runStep,
    })

    for (const action of [
      'analyze_characters',
      'analyze_locations',
      'analyze_props',
      'split_clips',
      'screenplay_conversion',
    ]) {
      const prompt = promptsByAction.get(action)
      expect(prompt, action).toBeTruthy()
      expect(prompt!.startsWith(genreConstraint)).toBe(true)
    }
  })

  it('does not inject genre when genreConstraint is omitted', async () => {
    const runStep = vi.fn(async (_meta, prompt: string, action: string) => {
      if (action === 'analyze_characters') {
        expect(prompt.startsWith('题材约束')).toBe(false)
        return { text: JSON.stringify({ characters: [{ name: '甲', introduction: '人物介绍' }] }), reasoning: '' }
      }
      if (action === 'analyze_locations') {
        return { text: JSON.stringify({ locations: [{ name: '地点A' }] }), reasoning: '' }
      }
      if (action === 'analyze_props') {
        return { text: JSON.stringify({ props: [] }), reasoning: '' }
      }
      if (action === 'split_clips') {
        return {
          text: JSON.stringify([
            {
              start: '甲在门口',
              end: '乙回答',
              summary: '片段摘要',
              location: '地点A',
              characters: ['甲'],
            },
          ]),
          reasoning: '',
        }
      }
      return { text: JSON.stringify({ scenes: [{ id: 1 }] }), reasoning: '' }
    })

    await runStoryToScriptOrchestrator({
      content: '甲在门口。乙回答。',
      baseCharacters: [],
      baseLocations: [],
      baseCharacterIntroductions: [],
      promptTemplates: {
        characterPromptTemplate: '{input} {characters_lib_name} {characters_lib_info}',
        locationPromptTemplate: '{input} {locations_lib_name}',
        propPromptTemplate: '{input} {props_lib_name}',
        clipPromptTemplate: '{input} {locations_lib_name} {characters_lib_name} {characters_introduction}',
        screenplayPromptTemplate: '{clip_content} {locations_lib_name} {characters_lib_name} {characters_introduction} {clip_id}',
      },
      runStep,
    })

    expect(runStep).toHaveBeenCalled()
  })
})
