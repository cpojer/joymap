import React, { PropTypes } from 'react';
import CSSModules from 'react-css-modules';

import { map } from 'lodash/fp';
import classnames from 'classnames';

import styles from './Gamepad.mstyl';

const analogInputs = ['L', 'R'];
const shoulderInputs = ['L2', 'L1', 'R2', 'R1'];
const digitalInputs = [
    'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight',
    'A', 'B', 'X', 'Y',
    'start', 'select', 'home'
];

class Gamepad extends React.Component {

    static propTypes = {
        backgroundColor: PropTypes.string.isRequired,
        pressedColor: PropTypes.string.isRequired,
        player: PropTypes.object.isRequired,
        children: React.PropTypes.node
    };

    state = {
        waiting: null
    };

    handleRebind(inputName) {
        const { player } = this.props;

        if (player.connected) {
            player.buttonRebindOnPress(
                inputName,
                () => this.setState({ waiting: null })
            );
            this.setState({ waiting: inputName });
        }
    }

    handleCancelRebind = () => {
        this.props.player.cancelButtonRebindOnPress();
        this.setState({ waiting: null });
    };

    renderStick(inputName) {
        const { pressedColor } = this.props;
        const { sticks, buttons } = this.props.player;
        const { x, y } = sticks[inputName].value;

        return (
            <div
                key={inputName}
                styleName={inputName}
                onClick={() => this.handleRebind(`${inputName}3`)}
                style={{
                    transform: `translate(${x * 15}px, ${y * 15}px)`,
                    backgroundColor: buttons[`${inputName}3`].pressed ? pressedColor : ''
                }} />);
    }

    renderDigital(inputName) {
        const { pressedColor } = this.props;
        const { pressed } = this.props.player.buttons[inputName];

        return (
            <div
                key={inputName}
                styleName={inputName}
                onClick={() => this.handleRebind(inputName)}
                style={{
                    backgroundColor: pressed ? pressedColor : ''
                }} />);
    }

    renderShoulder(inputName) {
        const { value } = this.props.player.buttons[inputName];

        return (
            <div
                key={inputName}
                style={{
                    transform: `translateY(${value * 10}px)`,
                    width: '100%',
                    height: '100%'
                }}>
                <div styleName={inputName} />
            </div>);
    }

    render() {
        const { player, backgroundColor, pressedColor, children } = this.props;
        const { waiting } = this.state;

        return (
            <div
                styleName={classnames('gamepad', { disconnected: !player.connected, waiting: !!waiting })}
                style={{ backgroundColor }}>
                <div styleName="react-inputs">
                    <span styleName="player-name" style={{ color: pressedColor }}>{player.name}</span>
                    <div styleName="back" />
                    {map(inputName => this.renderShoulder(inputName), shoulderInputs)}
                    {map(inputName => this.renderStick(inputName), analogInputs)}
                    {map(inputName => this.renderDigital(inputName), digitalInputs)}
                </div>
                {!waiting ? null :
                    <div
                        styleName="waiting-message"
                        onClick={this.handleCancelRebind}>
                        Rebinding {waiting}
                    </div>}
                {children}
            </div>);
    }
}

export default CSSModules(Gamepad, styles, { allowMultiple: true });
