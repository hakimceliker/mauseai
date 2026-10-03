import React from 'react';

export interface Checkpoint {
  number: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  description?: string;
  timestamp?: string;
}

interface ExecutionTimelineProps {
  checkpoints: Checkpoint[];
  currentStep?: number;
}

export function ExecutionTimeline({ checkpoints }: ExecutionTimelineProps) {
  return (
    <div className="execution-timeline">
      {checkpoints.map((checkpoint, index) => {
        const isCompleted = checkpoint.status === 'completed';
        const isCurrent = checkpoint.status === 'current';

        return (
          <div key={checkpoint.number} className="execution-step">
            <div className="execution-rail">
              <div
                className={`execution-node ${
                  isCompleted
                    ? 'completed'
                    : isCurrent
                    ? 'current'
                    : 'pending'
                }`}
              >
                {isCompleted ? '✓' : checkpoint.number}
              </div>

              {index !== checkpoints.length - 1 && (
                <div className={`execution-line ${
                    isCompleted
                      ? 'completed'
                      : isCurrent
                      ? 'current'
                      : 'pending'
                  }`}></div>
              )}
            </div>

            <div className={`execution-card ${
                isCompleted
                  ? 'completed'
                  : isCurrent
                  ? 'current'
                  : 'pending'
              }`}>
              <div className="execution-card-body">
                <div className="execution-card-heading">
                  <div>
                    <h4 className={`execution-title ${
                        isCompleted
                          ? 'completed'
                          : isCurrent
                          ? 'current'
                          : 'pending'
                      }`}>
                      {checkpoint.name}
                    </h4>
                    {checkpoint.description && (
                      <p className="execution-description">{checkpoint.description}</p>
                    )}
                  </div>
                  {checkpoint.timestamp && (
                    <span className="execution-timestamp">{checkpoint.timestamp}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
