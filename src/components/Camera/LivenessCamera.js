// @flow
import * as React from 'react'
import { h } from 'preact'
import classNames from 'classnames'
import style from './style.css'
import theme from '../Theme/style.css'
import {preventDefaultOnClick} from '../utils'
import { CameraPure, CameraActions } from './index.js'
import Challenge from '../Liveness/Challenge'
import type { CameraType } from './CameraTypes'
import type { ChallengeType } from '../Liveness/Challenge'
import Timeout from '../Timeout'

type Props = {
  i18n: Object,
  challenges: ChallengeType[],
  onRedo: void => void,
  timeoutSeconds: number,
} & CameraType

type State = {
  currentIndex: number,
  isRecording: boolean,
  hasBecomeInactive: boolean,
  hasRecordingTakenTooLong: boolean,
}

const initialState = {
  currentIndex: 0,
  isRecording: false,
  hasBecomeInactive: false,
  hasRecordingTakenTooLong: false,
}

const inactiveError = { name: 'CAMERA_INACTIVE', type: 'warning' }
const recordingTooLongError = { name: 'LIVENESS_TIMEOUT', type: 'warning' }

export default class LivenessCamera extends React.Component<Props, State> {
  static defaultProps = {
    timeoutSeconds: 20,
  }

  timeout: TimeoutID
  webcam = null

  state: State = { ...initialState }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.challenges !== this.props.challenges) {
      this.setState({ ...initialState })
    }
  }

  startRecording = () => {
    this.webcam && this.webcam.startRecording()
    this.setState({isRecording: true, hasBecomeInactive: false})
  }

  stopRecording = () => {
    this.webcam && this.webcam.stopRecording()
    this.setState({isRecording: false})
  }

  handleRecordingStart = () => {
    this.startRecording()
  }

  handleRecordingStop = () => {
    const { hasRecordingTakenTooLong } = this.state
    this.stopRecording()
    if (this.webcam && !hasRecordingTakenTooLong) {
      this.props.onVideoRecorded(this.webcam.getVideoBlob(), this.props.challenges)
    }
  }

  handleNextChallenge = () => {
    this.setState({ currentIndex: this.state.currentIndex + 1 })
  }

  handleInactivityTimeout = () => {
    this.setState({ hasBecomeInactive: true })
  }

  handleRecordingTimeout = () => {
    this.setState({ hasRecordingTakenTooLong: true })
    this.stopRecording()
  }

  renderRedoButton = () => (
    <button
      onClick={preventDefaultOnClick(this.props.onRedo)}
      className={classNames(theme.btn, theme['btn-ghost'], style.errorActionBtn)}
    >{this.props.i18n.t('capture.liveness.challenges.redo_video')}</button>
  )

  cameraError = () => {
    const { hasRecordingTakenTooLong, hasBecomeInactive } = this.state

    if (!this.props.hasError) {
      if (hasBecomeInactive) {
        return {
          hasError: true,
          cameraError: inactiveError,
        }
      }

      if (hasRecordingTakenTooLong) {
        return {
          hasError: true,
          cameraError: recordingTooLongError,
          cameraErrorRenderAction: this.renderRedoButton,
          cameraErrorHasBackdrop: true,
        }
      }
    }
  }

  render = () => {
    const { i18n, challenges = [], hasGrantedPermission } = this.props
    const { isRecording, currentIndex } = this.state
    const { type, value } = challenges[currentIndex] || {}
    const isLastChallenge = currentIndex === challenges.length - 1
    const title = isRecording ? '' : i18n.t('capture.liveness.challenges.position_face')

    return (
      <div className={style.livenessCamera}>
        {
          hasGrantedPermission ?
            isRecording ?
              <Timeout key="recording" seconds={ 20 } onTimeout={ this.handleRecordingTimeout } /> :
              <Timeout key="notRecording" seconds={ 12 } onTimeout={ this.handleInactivityTimeout } />
            :
            null
        }
        <CameraPure
          {...{
            ...this.props,
            video: true,
            isWithoutHole: isRecording,
            webcamRef: c => this.webcam = c,
            title,
            subTitle: '',
          }}
          {...this.cameraError() }
        />
        <div className={style.caption}>
        {
          isRecording &&
            <div>
              <div className={style.recordingIndicator}>
                {i18n.t('capture.liveness.recording')}
              </div>
              <Challenge {...{i18n, type, value}} />
            </div>
        }
        </div>
        <CameraActions>
          <div className={classNames(style.captureActionsHint, {
            [style.recordAction]: !isRecording,
          })}>
            { isRecording ?
              i18n.t(`capture.liveness.challenges.done_${ isLastChallenge ? 'stop' : 'next' }`) :
              i18n.t('capture.liveness.press_record')
            }
          </div>
          {
            !isLastChallenge && isRecording ?
              <button
                className={`${theme.btn} ${theme['btn-centered']} ${theme['btn-primary']}`}
                onClick={this.handleNextChallenge}>
                {this.props.i18n.t('capture.liveness.challenges.next')}
              </button> :
              <button
                className={classNames(style.btn, {
                  [style.stopRecording]: isRecording,
                  [style.startRecording]: !isRecording,
                })}
                onClick={isRecording ? this.handleRecordingStop : this.handleRecordingStart}
                disabled={this.props.hasError}
              />
          }
        </CameraActions>
      </div>
    )
  }
}
