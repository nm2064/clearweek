# How ClearWeek makes a plan

The aim is to answer a simple question: **Can I finish this work with the time I actually have?**

## The steps

1. Look at the next seven local calendar days.
2. Give each day its share of your repeating weekly hours.
3. Remove completed tasks and subtract time you have already logged.
4. Put earlier deadlines first. For the same deadline, higher priority comes first, then a stable task ID.
5. Fill the earliest available day with work, in pieces of up to 90 minutes. Upcoming tasks are never placed after their deadline.
6. Show any time that could not fit. Work due within the week needs attention; work due later can be planned later. Overdue work can start today and keeps its overdue label.

The order is stable, so rearranging a backup's task list does not change the plan. The daily display combines pieces of the same task into one row. These are amounts of work, not fixed appointment times.

## An example

You have one hour today and one hour tomorrow. A two-hour task is due tomorrow. A second one-hour task is due next week.

The first task gets today's hour and tomorrow's hour. The second task waits for another available day. If you reduce tomorrow to half an hour, the first task shows that it needs another 30 minutes before its deadline.

## Why keep it small?

Planning is a pure function in `src/planner.js`: tasks and available time go in; days and results come out. The interface does not decide which deadline wins. That makes the rules easier to check and change.

Dates are stored as calendar dates rather than local midnight timestamps. Date arithmetic uses whole calendar days, which avoids an extra or missing hour when clocks change. The starting day still comes from the user's local date.

Task text is inserted as text, so markup in a task name is displayed literally. Backups are checked before changing the plan. Invalid saved data is left in browser storage for recovery rather than silently overwritten. A failed save produces a warning.

The calendar exporter escapes special characters, wraps long lines without breaking letters, and gives all-day events the following date as their end. Tests check those details.

## Files to start with

| File | What it does |
| --- | --- |
| `src/planner.js` | Assigns work to available days |
| `src/dates.js` | Works with dates and readable time |
| `src/storage.js` | Checks and saves plans and backups |
| `src/calendar.js` | Makes a calendar deadline file |
| `src/app.js` | Connects the plan to the screen |
| `sw.js` | Keeps the app files available offline |
| `test/` | Checks the planning and file rules |

## Current limits and possible next steps

The app plans at most 500 tasks, up to 100 hours per task, and up to 12 available hours per day. Work and availability use 15-minute estimates; logged progress can be any whole number of minutes.

It assumes tasks can be split and started independently. A future version could add tasks that must come first, fixed meetings, and optional rest days. Those would need explicit rules and tests rather than silently changing today's behaviour.

When changing cached app files, also change the cache version in `sw.js`. A returning visitor may need a second reload after a new version has finished loading.
