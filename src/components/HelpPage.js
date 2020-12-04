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

    initCollapsing(tags) {
        for (const t of tags) {
            t.setAttribute("collapsed", true);
            t.addEventListener("click", () => { this.collapse(t) });
            this.collapse(t);
        }
    }

    collapse(t) {
        const display = t.getAttribute("collapsed") === "true" ? "none" : "block";
        t.setAttribute("collapsed", !(t.getAttribute("collapsed") === "true"));
        t.style.setProperty("--border-width", t.getAttribute("collapsed") === "true" ? "10px 5px 0px 5px" : "5px 0px 5px 10px");
        t.style.setProperty("--border-color", t.getAttribute("collapsed") === "true" ? "#575757 transparent transparent transparent" 
            : "transparent transparent transparent #575757");
        
        let next = t.nextSibling;
        while (next && !["H3", "H4", "HR"].includes(next.tagName)) {
            next.style.display = display;
            next = next.nextSibling;
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.show && this.props.show !== prevProps.show) {
            this.setState({}, () => {
                this.initCollapsing(document.querySelectorAll(".rs-modal-body h4"));
            })
        }
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