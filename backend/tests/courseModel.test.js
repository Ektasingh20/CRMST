import test from 'node:test';
import assert from 'node:assert/strict';

import { assembleCourseResponse } from '../config/firestoreCourseModel.js';

test('assembleCourseResponse rebuilds section and lesson data from real lesson entries', () => {
  const course = assembleCourseResponse({
    id: 'course-1',
    title: 'Frontend Fundamentals',
    status: 'active',
  }, [
    { id: 'lesson-1', title: 'HTML Intro', section: 'HTML' },
    { id: 'lesson-1', title: 'CSS Basics', section: 'CSS' },
  ], []);

  assert.equal(course.totalLessons, 2);
  assert.deepEqual(course.sections.map((section) => section.name), ['HTML', 'CSS']);
  assert.deepEqual(course.sections.map((section) => section.lessons.map((lesson) => lesson.title)), [['HTML Intro'], ['CSS Basics']]);
  assert.equal(course.lessons.length, 2);
  assert.deepEqual(course.lessons.map((lesson) => lesson.title), ['HTML Intro', 'CSS Basics']);
  assert.equal(course.lessons.find((lesson) => lesson.section === 'CSS')?.title, 'CSS Basics');
});
