'use client';

import {useState} from 'react';
import {genjutsuModeQuestions,checkGenjutsuMode} from '../../../../lib/k4k-genjutsu-mode-practice.mjs';

const modes = [
  {value:'object',label:'OBJECT SWAP'},
  {value:'motion',label:'MOTION TRANSFER'}
];

export default function GenjutsuModePractice(){
  const [answers,setAnswers] = useState({});
  const correctCount = genjutsuModeQuestions.filter(question => checkGenjutsuMode(question.id,answers[question.id])?.correct).length;

  return <section className="k4k-swap-guide" aria-labelledby="genjutsu-practice-title">
    <div className="k4k-swap-guide-header">
      <div>
        <span className="k4k-course-kicker">QUICK PRACTICE / INSTANT FEEDBACK</span>
        <h2 id="genjutsu-practice-title">CHOOSE THE RIGHT<br/><em>GENJUTSU MODE.</em></h2>
        <p>Try two real creator decisions before spending generation credits. Your answers stay on this page and are not saved to your account.</p>
      </div>
      <strong aria-live="polite">{correctCount}/{genjutsuModeQuestions.length} CORRECT</strong>
    </div>
    {genjutsuModeQuestions.map((question,index) => {
      const selected = answers[question.id];
      const feedback = checkGenjutsuMode(question.id,selected);
      return <fieldset key={question.id} style={{border:0,padding:0,margin:'22px 0'}}>
        <legend style={{fontWeight:700,marginBottom:12}}>SCENARIO {index+1}: {question.scenario}</legend>
        <div className="k4k-studio-mode-grid">
          {modes.map(mode => <button key={mode.value} type="button" className={selected===mode.value?'selected':''}
            aria-pressed={selected===mode.value} onClick={() => setAnswers(previous => ({...previous,[question.id]:mode.value}))}>
            <strong>{mode.label}</strong>
          </button>)}
        </div>
        {feedback && <p role="status" style={{marginTop:12}}>
          <strong>{feedback.correct?'Correct.':'Try the other mode.'}</strong> {feedback.explanation}
        </p>}
      </fieldset>;
    })}
    <p className="k4k-swap-source-note">Learn more in the <a href="https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-genjutsu" target="_blank" rel="noopener noreferrer">official Higgsfield Genjutsu guide</a>. This practice does not generate videos or use credits.</p>
  </section>;
}
