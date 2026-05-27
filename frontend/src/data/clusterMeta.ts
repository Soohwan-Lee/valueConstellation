/**
 * Cluster metadata derived from full_argument_projection_compare_metadata.json
 * Labels from LLM interpretation — editable in the UI.
 */
import type { ClusterMeta } from '../types'

export const INITIAL_CLUSTER_META: ClusterMeta[] = [
  {
    cluster_id: 0,
    label: '지역 소멸·생존 위기',
    size: 3,
    topValues: [
      { value: 'universalism_nature', mean_signed: -0.576 },
      { value: 'security_societal', mean_signed: -0.166 },
      { value: 'universalism_concern', mean_signed: -0.014 },
    ],
  },
  {
    cluster_id: 1,
    label: '안전사고·재정 위기',
    size: 12,
    topValues: [
      { value: 'security_societal', mean_signed: -0.748 },
      { value: 'power_resources', mean_signed: -0.095 },
      { value: 'conformity_interpersonal', mean_signed: -0.022 },
    ],
  },
  {
    cluster_id: 2,
    label: '분권 개혁·구조 전환',
    size: 32,
    topValues: [
      { value: 'self_direction_action', mean_signed: 0.479 },
      { value: 'stimulation', mean_signed: 0.132 },
      { value: 'self_direction_thought', mean_signed: 0.086 },
    ],
  },
  {
    cluster_id: 3,
    label: '중앙집권 반대·절차 비판',
    size: 2,
    topValues: [
      { value: 'self_direction_action', mean_signed: -0.440 },
      { value: 'power_dominance', mean_signed: -0.027 },
      { value: 'security_societal', mean_signed: -0.018 },
    ],
  },
  {
    cluster_id: 4,
    label: '일반적 정책 논쟁',
    size: 191,
    topValues: [
      { value: 'power_resources', mean_signed: 0.047 },
      { value: 'stimulation', mean_signed: 0.037 },
      { value: 'security_societal', mean_signed: 0.028 },
    ],
  },
  {
    cluster_id: 5,
    label: '제도화·규칙 강조',
    size: 16,
    topValues: [
      { value: 'conformity_rules', mean_signed: 0.576 },
      { value: 'self_direction_action', mean_signed: 0.068 },
      { value: 'power_dominance', mean_signed: 0.068 },
    ],
  },
]

/** PCA axis labels from LLM interpretation */
export const AXIS_LABELS = {
  x: '사회적 안전·집단 보호 ↔ 자율·변화 지향',
  y: '집단 안전·권위 관리 ↔ 자율·보편주의·참여',
}
