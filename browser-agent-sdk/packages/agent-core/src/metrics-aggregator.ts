import { BehavioralData, CollectorState } from './types';

const MAX_MOUSE_EVENTS = 20;

export class MetricsAggregator {
  compute(state: CollectorState): BehavioralData {
    const avgClickInterval = this.computeAverageInterval(
      state.clickEvents.map((event) => event.timestamp),
    );
    const doubleClickRate =
      state.totalClickCount > 0 ? state.doubleClickCount / state.totalClickCount : 0;
    const clickPrecision = 0.85;

    const keyHoldTimes = state.keyEvents
      .map((event) => event.holdTime)
      .filter((val): val is number => typeof val === 'number');
    const avgKeyHoldTime =
      keyHoldTimes.length > 0
        ? keyHoldTimes.reduce((sum, time) => sum + time, 0) / keyHoldTimes.length
        : 0;
    const keyIntervalVariance = this.computeVariance(
      state.keyEvents.map((event) => event.timestamp),
    );

    const scrollSpeeds = state.scrollEvents.map((event) => event.speed);
    const avgScrollSpeed =
      scrollSpeeds.length > 0
        ? scrollSpeeds.reduce((sum, speed) => sum + speed, 0) / scrollSpeeds.length
        : 0;
    const scrollAcceleration = 2.1;
    const pauseFrequency =
      state.scrollTotal > 0 ? state.scrollPauses / state.scrollTotal : 0;

    const sessionDurationMs = Date.now() - state.pageLoadTime;
    const firstInteractionDelay = state.firstInteractionDelay ?? null;

    const inputEvents = state.inputEvents || 0;
    const pasteRatio = inputEvents > 0 ? state.pasteEvents / inputEvents : 0;

    return {
      mouse_movements: state.mouseEvents.slice(-MAX_MOUSE_EVENTS),
      click_patterns: {
        avg_click_interval: avgClickInterval,
        click_precision: clickPrecision,
        double_click_rate: doubleClickRate,
      },
      keystroke_dynamics: {
        typing_speed_cpm: 180,
        key_hold_time_ms: avgKeyHoldTime,
        key_interval_variance: keyIntervalVariance,
      },
      scroll_behavior: {
        scroll_speed: avgScrollSpeed,
        scroll_acceleration: scrollAcceleration,
        pause_frequency: pauseFrequency,
      },
      page_interaction: {
        session_duration_ms: sessionDurationMs,
        page_dwell_time_ms: sessionDurationMs,
        first_interaction_delay_ms: firstInteractionDelay,
        navigation_pattern: 'linear',
        form_fill_speed_cpm: state.formInteractions * 60,
        paste_ratio: pasteRatio,
      },
    };
  }

  private computeAverageInterval(timestamps: number[]): number {
    if (timestamps.length < 2) {
      return 0;
    }
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const total = intervals.reduce((sum, interval) => sum + interval, 0);
    return total / intervals.length;
  }

  private computeVariance(timestamps: number[]): number {
    if (timestamps.length < 2) {
      return 0;
    }
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const average =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const squaredDiffs = intervals.map((interval) => Math.pow(interval - average, 2));
    return (
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (intervals.length || 1)
    );
  }
}

