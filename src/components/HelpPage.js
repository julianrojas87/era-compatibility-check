import React, { Component } from "react";
import { Modal } from "rsuite";
import ReactMarkdown from "react-markdown";
import content from "../docs/help-page.md";

export class HelpPage extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    close = () => {
        this.props.toggleHelpPage(false);
    }

    render() {
        const { show } = this.props;
        return (
            <div className="modal-container">
                <Modal overflow size="lg" show={show} onHide={this.close}>
                    <Modal.Header></Modal.Header>
                    <Modal.Body>
                        <ReactMarkdown source={content}></ReactMarkdown>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}