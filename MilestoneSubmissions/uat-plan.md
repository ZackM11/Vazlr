

| Test ID | Feature / Requirement | Preconditions | Test data | User steps | Expected result | Tester ID | Actual result | Status | Issue / follow-up |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| UAT-01 | Registration / account creation | Registration page is open; user is signed out | Unique username; password left blank | Enter username, Leave password blank, Submit | Registration doesn’t complete; shows error message indicating missing password | T1 | Not run | Not run | None yet |
| UAT-02 | Registration / account creation | Registration page is open; user is signed out | Unique username; valid password | Enter username, Enter password meeting reqs | Registration completes and user is prompted to go to login page | T1 | Not run | Not run | None yet |
| UAT-03 | Login / Sign in | Login page is open; user is signed out | Username entered, incorrect password entered | Enter username, enter invalid password | Login fails; user is told that the username is password is incorrect | T1 | Not run  | Not run | None yet |
| UAT-04 | Login / sign in | Login page is open; user is signed out | Username entered, correct password entered | Enter username, enter correct password | Login succeeds and the user is redirect to the correct dashboard | T1 | Not run | Not run | None yet |
| UAT-05 | Event Creation / Organization Dashboard | Organization dashboard is open; user is signed in | Create a new event and don’t enter all of the required fields | Push create new event button, Enter the information leaving out one field. Press save event | Create event fails; Empty field is highlighted and user is requested to fill it in | T1 | Not run | Not run | None yet |
| UAT-06 | Event Creation / Organization Dashboard | Organization dashboard is open; user is signed in | Create a new event and fill in the required fields | Push create new event button, Enter the required information, press save event | Create event succeeds; Modal closes and event is shown the calendar and required lists | T1 | Not run |  Not run  | None yet |

