
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
} from "@testing-library/react";

import PomodoroTimer from "./PomodoroTimer";

describe("Pomodoro Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advanceTime = (milliseconds) => {
    act(() => {
      vi.advanceTimersByTime(milliseconds);
    });
  };

  it("renders the default focus timer", () => {
    render(<PomodoroTimer />);

    expect(screen.getByRole("timer").textContent).toBe("25:00");
  });

  it("starts the timer", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    expect(screen.getByText("⏸ Pause")).toBeTruthy();
  });

  it("counts down accurately", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(1000);

    expect(screen.getByRole("timer").textContent).toBe("24:59");
  });

  it("pauses the timer", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(3000);

    fireEvent.click(screen.getByText("⏸ Pause"));

    const pausedTime = screen.getByRole("timer").textContent;

    advanceTime(5000);

    expect(screen.getByRole("timer").textContent).toBe(pausedTime);
  });

  it("resumes the timer after pausing", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(2000);

    fireEvent.click(screen.getByText("⏸ Pause"));

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(1000);

    expect(screen.getByRole("timer").textContent).toBe("24:57");
  });

  it("resets the timer", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(5000);

    fireEvent.click(screen.getByText("↻ Reset"));

    expect(screen.getByRole("timer").textContent).toBe("25:00");
  });

  it("switches from focus to short break", () => {
    render(<PomodoroTimer />);

    fireEvent.change(screen.getByLabelText("Focus (minutes)"), {
      target: { value: "1" },
    });

    fireEvent.blur(screen.getByLabelText("Focus (minutes)"));

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(60000);

    expect(
      screen.getByRole("button", { name: "Short Break" })
        .getAttribute("aria-pressed")
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

    fireEvent.click(screen.getByText("Apply Settings"));

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText("▶ Start"));
      advanceTime(60000);

      if (i < 3) {
        expect(
          screen.getByRole("button", { name: "Short Break" })
            .getAttribute("aria-pressed")
        ).toBe("true");

        fireEvent.click(screen.getByText("▶ Start"));
        advanceTime(60000);
      }
    }

    expect(
      screen.getByRole("button", { name: "Long Break" })
        .getAttribute("aria-pressed")
    ).toBe("true");

    expect(screen.getByRole("timer").textContent).toBe("02:00");
  });

  it("returns to focus after a break", () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("Short Break"));

    expect(screen.getByRole("timer").textContent).toBe("05:00");

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(300000);

    expect(
      screen.getByRole("button", { name: "Focus Time" })
        .getAttribute("aria-pressed")
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
      screen.getByText("Current task: Learn React")
    ).toBeTruthy();
  });

  it("does not automatically complete tasks", () => {
    const tasks = [
      { id: 1, title: "Learn React", completed: false },
    ];

    render(<PomodoroTimer tasks={tasks} />);

    fireEvent.click(screen.getByText("▶ Start"));

    advanceTime(1000);

    expect(tasks[0].completed).toBe(false);
  });

  it("cleans up the interval on unmount", () => {
    const { unmount } = render(<PomodoroTimer />);

    fireEvent.click(screen.getByText("▶ Start"));

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

});
