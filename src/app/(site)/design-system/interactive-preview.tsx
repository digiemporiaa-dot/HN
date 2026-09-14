"use client";

import { useState } from "react";

import {
  Accordion,
  Button,
  Drawer,
  Field,
  Input,
  Modal,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
} from "@/components/ui";

export function InteractivePreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button variant="outline" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabList label="Component preview">
          <Tab value="overview">Overview</Tab>
          <Tab value="specifications">Specifications</Tab>
          <Tab value="applications">Applications</Tab>
        </TabList>
        <TabPanel value="overview">
          <p className="text-body text-ink-muted max-w-[62ch]">
            Tabs follow the WAI-ARIA pattern: arrow keys move between tabs, Home
            and End jump to the ends, and only the active tab is in the tab
            order.
          </p>
        </TabPanel>
        <TabPanel value="specifications">
          <p className="text-body text-ink-muted max-w-[62ch]">
            Panels are rendered only when active, keeping the DOM small on
            specification-heavy product pages.
          </p>
        </TabPanel>
        <TabPanel value="applications">
          <p className="text-body text-ink-muted max-w-[62ch]">
            Each panel is focusable so keyboard users land inside the content
            after activating a tab.
          </p>
        </TabPanel>
      </Tabs>

      <Accordion
        items={[
          {
            id: "one",
            question: "How is the accordion made accessible?",
            answer: (
              <p>
                Each trigger is a button carrying <code>aria-expanded</code> and{" "}
                <code>aria-controls</code>, and each panel is a labelled region.
              </p>
            ),
          },
          {
            id: "two",
            question: "Can several panels be open at once?",
            answer: (
              <p>
                Yes — pass <code>allowMultiple</code>. Single-open is the default
                because it reads better for FAQ content.
              </p>
            ),
          },
        ]}
      />

      <form className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required>
          {(props) => <Input placeholder="Dr. A. Sharma" {...props} />}
        </Field>
        <Field label="Hospital or company" required>
          {(props) => <Input placeholder="City General Hospital" {...props} />}
        </Field>
        <Field label="State">
          {(props) => (
            <Select {...props}>
              <option value="">Select a state</option>
              <option value="dl">Delhi</option>
              <option value="mh">Maharashtra</option>
            </Select>
          )}
        </Field>
        <Field
          label="Work email"
          error="Enter a valid email address"
          required
        >
          {(props) => <Input type="email" defaultValue="not-an-email" {...props} />}
        </Field>
        <Field
          label="Requirement"
          help="Describe quantities, specifications and expected timeline."
          className="sm:col-span-2"
        >
          {(props) => (
            <Textarea placeholder="10 × infusion pumps for a new ICU wing" {...props} />
          )}
        </Field>
      </form>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm action"
        description="Destructive operations always require explicit confirmation."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-body text-ink-muted">
          Built on the native dialog element, so focus trapping, focus
          restoration and Escape handling come from the platform.
        </p>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Request for Quotation"
        footer={
          <Button block onClick={() => setDrawerOpen(false)}>
            Continue
          </Button>
        }
      >
        <p className="text-body-sm text-ink-muted">
          The same drawer powers the RFQ basket, mobile filters and mobile
          navigation.
        </p>
      </Drawer>
    </div>
  );
}
