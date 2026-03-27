import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime

scheduler = BlockingScheduler()


def run_pipeline_job():
    print(f"\n[SCHEDULER] Triggering pipeline run at {datetime.utcnow().isoformat()}")
    try:
        from pipeline_runner import run_full_pipeline

        run_full_pipeline()
        print(f"[SCHEDULER] Pipeline complete")
    except Exception as e:
        print(f"[SCHEDULER] Pipeline failed: {e}")


@scheduler.scheduled_job(IntervalTrigger(minutes=30))
def scheduled_pipeline():
    run_pipeline_job()


if __name__ == "__main__":
    print(f"[SCHEDULER] Starting — pipeline runs every 30 minutes")
    print(f"[SCHEDULER] First run at startup...")
    run_pipeline_job()
    print(f"[SCHEDULER] Scheduler active — next run in 30 minutes")
    try:
        scheduler.start()
    except KeyboardInterrupt:
        print(f"[SCHEDULER] Stopped")
        scheduler.shutdown()
