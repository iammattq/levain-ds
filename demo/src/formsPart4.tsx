// T55: TagInput, EditableText and ChatInput in the states apps show them, inside the forms section, for the
// before/after capture of the form-input convention. Every prop here is one both the old and the new components take
// (so TagInput keeps the deprecated `selectedTags` and `compact`, and the error passes `touched` as the old one needed),
// so the same section renders before and after.
import { ChatInput, EditableText, TagInput } from '@levain/ui-react';
import { useState } from 'react';

const TAGS = [
  { id: 'design', name: 'Design' },
  { id: 'research', name: 'Research' },
  { id: 'react', name: 'React' },
  { id: 'release', name: 'Release notes' },
];

export function FormsPart4() {
  const [tags, setTags] = useState(['design', 'react']);
  const [few, setFew] = useState<string[]>([]);
  const [small, setSmall] = useState(['research']);
  const [title, setTitle] = useState('Spring journal');
  const [plain, setPlain] = useState('Double-click, Enter or F2 to rename');
  const [prompt, setPrompt] = useState('');
  const [long, setLong] = useState('Make the sky warmer and the hills a deeper green, keep the river.');

  return (
    <div data-demo="forms-part4" className="grid gap-md">
      <TagInput id="forms-tags" label="Tags" availableTags={TAGS} selectedTags={tags} onChange={setTags} helperText="Type to find a tag; arrows and Enter pick one." />
      <TagInput id="forms-tags-error" label="Topics" required availableTags={TAGS} selectedTags={few} onChange={setFew} error="Pick at least one topic." touched />
      <TagInput id="forms-tags-compact" label="Compact tags" compact availableTags={TAGS} selectedTags={small} onChange={setSmall} />
      <TagInput id="forms-tags-disabled" label="Disabled tags" disabled availableTags={TAGS} selectedTags={['release']} onChange={() => {}} />
      <div className="flex flex-wrap items-center gap-md">
        <EditableText value={title} onSave={setTitle} showEditIcon className="type-heading-4" />
        <EditableText value={plain} onSave={setPlain} />
        <EditableText value="Disabled" onSave={() => {}} disabled />
      </div>
      <ChatInput value={prompt} onChange={e => setPrompt(e.target.value)} onSubmit={() => setPrompt('')} placeholder="Describe how to modify the image..." maxLength={500} submitLabel="Refine image" />
      <ChatInput value={long} onChange={e => setLong(e.target.value)} onSubmit={() => {}} placeholder="Over the limit" maxLength={40} />
      <ChatInput value="" onChange={() => {}} onSubmit={() => {}} placeholder="Disabled" disabled />
    </div>
  );
}
