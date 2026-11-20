
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
  within,
} from "@testing-library/react";

import PomodoroTimer from "./PomodoroTimer";

describe("Pomodoro Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00"));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const advanceTime = (milliseconds) => {
    act(() => {
      vi.advanceTimersByTime(milliseconds);
    });
  };

  const clickButton = (name) => {
    fireEvent.click(screen.getByRole("button", { name }));
  };

  const startTimer = () => {
    clickButton("▶ Start");
  };

  it("renders the default focus timer", () => {
    render(<PomodoroTimer />);

    expect(screen.getByRole("timer").textContent).toBe("25:00");
  });

  it("starts the timer", () => {
    render(<PomodoroTimer />);

    startTimer();

    expect(screen.getByText("⏸ Pause")).toBeTruthy();
  });

  it("counts down accurately", () => {
    render(<PomodoroTimer />);

    startTimer();
    advanceTime(1000);

    expect(screen.getByRole("timer").textContent).toBe("24:59");
  });

  it("pauses the timer", () => {
    render(<PomodoroTimer />);

    startTimer();
    advanceTime(3000);

    clickButton("⏸ Pause");

    const pausedTime = screen.getByRole("timer").textContent;

    advanceTime(5000);

    expect(screen.getByRole("timer").textContent).toBe(pausedTime);
  });

  it("resumes the timer after pausing", () => {
    render(<PomodoroTimer />);

    startTimer();
    advanceTime(2000);

    clickButton("⏸ Pause");
    startTimer();

    advanceTime(1000);

    expect(screen.getByRole("timer").textContent).toBe("24:57");
  });

  it("resets the timer", () => {
    render(<PomodoroTimer />);

    startTimer();
    advanceTime(5000);

    clickButton("↻ Reset");

    expect(screen.getByRole("timer").textContent).toBe("25:00");
  });

  it("switches from focus to short break", () => {
    render(<PomodoroTimer />);

    fireEvent.change(screen.getByLabelText("Focus (minutes)"), {
      target: { value: "1" },
    });

    fireEvent.blur(screen.getByLabelText("Focus (minutes)"));

    startTimer();
    advanceTime(60000);

    expect(
      screen.getByRole("button", { name: "Short Break" }).getAttribute("aria-pressed")
    ).toBe("true");

    expect(screen.getByRole("timer").textContent).toBe("05:00");
  });

  it("starts a long break after four focus sessions", () => {
    render(<PomodoroTimer />);

    fireEvent.change(screen.getByLabelText("Focus (minutes)"), {
      target: { value: "1" },
    });

    fireEvent.change(screen.getByLabelText("Short Break (minutes)"), {
      target: { value: "1" },
    });

    fireEvent.change(screen.getByLabelText("Long Break (minutes)"), {
      target: { value: "2" },
    });

    clickButton("Apply Settings");

    for (let i = 0; i < 4; i++) {
      startTimer();
      advanceTime(60000);

      if (i < 3) {
        expect(
          screen.getByRole("button", { name: "Short Break" }).getAttribute("aria-pressed")
        ).toBe("true");

        startTimer();
        advanceTime(60000);
      }
    }

    expect(
      screen.getByRole("button", { name: "Long Break" }).getAttribute("aria-pressed")
    ).toBe("true");

    expect(screen.getByRole("timer").textContent).toBe("02:00");
  });

  it("returns to focus after a break", () => {
    render(<PomodoroTimer />);

    clickButton("Short Break");

    expect(screen.getByRole("timer").textContent).toBe("05:00");

    startTimer();
    advanceTime(300000);

    expect(
      screen.getByRole("button", { name: "Focus Time" }).getAttribute("aria-pressed")
    ).toBe("true");

    expect(screen.getByRole("timer").textContent).toBe("25:00");
  });

  it("allows associating a task", () => {
    render(
      <PomodoroTimer
        tasks={[
          { id: 1, title: "Learn React" },
          { id: 2, title: "Practice DSA" },
        ]}
      />
    );

    fireEvent.change(
      screen.getByLabelText("Associate with a task"),
      { target: { value: "1" } }
    );
expect(
  screen.getByText("Learn React", { selector: "strong" })
).toBeTruthy();

    expect(
  screen.getByLabelText("Associate with a task").value
).toBe("1");

expect(
  screen.getByText("Learn React", { selector: "strong" })
).toBeTruthy();
  });

  it("does not automatically complete tasks", () => {
    const tasks = [
      { id: 1, title: "Learn React", completed: false },
    ];

    render(<PomodoroTimer tasks={tasks} />);

    startTimer();
    advanceTime(1000);

    expect(tasks[0].completed).toBe(false);
  });

  it("cleans up the interval on unmount", () => {
    const { unmount } = render(<PomodoroTimer />);

    startTimer();

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

